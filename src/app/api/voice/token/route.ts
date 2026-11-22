import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';
import { z } from 'zod';
import { GEMINI_VOICE_PERSONA_MAP, serverConfig } from '@/lib/config';
import { sql } from '@/lib/db';
import { EntitlementError, requireAuthenticatedUser } from '@/lib/entitlements';
import { buildRoleplaySystemPrompt } from '@/lib/gemini/roleplay';
import type { PressureLevel } from '@/lib/types';

export const dynamic = 'force-dynamic';

const tokenRequestSchema = z.object({
  sessionId: z.string().uuid(),
});

export async function POST(req: Request) {
  try {
    const user = await requireAuthenticatedUser(req);
    const body = await req.json();
    const parsed = tokenRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'INVALID_PAYLOAD', message: 'ID sesi tidak valid.' },
        { status: 400 }
      );
    }

    const { sessionId } = parsed.data;

    // 1. Verify active session ownership & quota
    if (user.remainingSessions <= 0) {
      return NextResponse.json(
        {
          error: 'QUOTA_EXHAUSTED',
          message: 'Kuota sesi Anda telah habis. Silakan upgrade ke Kalamuji Pro.',
        },
        { status: 403 }
      );
    }

    const sessionRows = await sql`
      SELECT
        id,
        counterpart_role,
        situation_goal,
        pressure_level,
        voice_persona,
        status
      FROM sessions
      WHERE id = ${sessionId}
        AND user_id = ${user.id}
      LIMIT 1
    `;

    if (sessionRows.length === 0) {
      return NextResponse.json(
        { error: 'SESSION_NOT_FOUND', message: 'Sesi tidak ditemukan.' },
        { status: 404 }
      );
    }

    const session = sessionRows[0];
    if (session.status !== 'active') {
      return NextResponse.json(
        { error: 'SESSION_NOT_ACTIVE', message: 'Sesi ini sudah selesai.' },
        { status: 409 }
      );
    }

    // 2. Load cross-session coaching memory for Pro users
    let memorySummary: string | null = null;
    if (user.planTier === 'pro') {
      const memRows = await sql`
        SELECT summary FROM coaching_memories WHERE user_id = ${user.id} LIMIT 1
      `;
      memorySummary = (memRows[0]?.summary as string | undefined) ?? null;
    }

    const systemInstruction = buildRoleplaySystemPrompt({
      counterpartRole: String(session.counterpart_role),
      situationGoal: String(session.situation_goal),
      pressureLevel: session.pressure_level as PressureLevel,
      voicePersona: String(session.voice_persona),
      crossSessionMemorySummary: memorySummary,
    });

    const voiceName =
      GEMINI_VOICE_PERSONA_MAP[String(session.voice_persona)] ?? 'Kore';
    const liveModel = serverConfig.gemini.liveModel;

    // 3. Mint short-lived Gemini Ephemeral Token (never exposes GEMINI_API_KEY to browser)
    const ai = new GoogleGenAI({
      apiKey: serverConfig.gemini.apiKey,
      httpOptions: { apiVersion: 'v1alpha' },
    });

    const now = Date.now();
    const expireTime = new Date(now + 20 * 60 * 1000).toISOString(); // 20 min max session
    const newSessionExpireTime = new Date(now + 2 * 60 * 1000).toISOString(); // 2 min to connect

    const tokenRes = await ai.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        newSessionExpireTime,
        httpOptions: { apiVersion: 'v1alpha' },
      },
    });

    if (!tokenRes?.name) {
      throw new Error('EPHEMERAL_TOKEN_EMPTY');
    }

    return NextResponse.json(
      {
        token: tokenRes.name,
        model: liveModel,
        voiceName,
        systemInstruction,
        expireTime,
      },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store, max-age=0' },
      }
    );
  } catch (error) {
    if (error instanceof EntitlementError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.status }
      );
    }
    console.error('[voice/token] Error:', error);
    return NextResponse.json(
      {
        error: 'EPHEMERAL_TOKEN_FAILED',
        message: 'Gagal membuat sesi suara real-time. Periksa GEMINI_API_KEY dan coba lagi.',
      },
      { status: 500 }
    );
  }
}
