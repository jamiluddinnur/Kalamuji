import { NextResponse } from 'next/server';
import { z } from 'zod';
import { serverConfig } from '@/lib/config';
import { sql } from '@/lib/db';
import { EntitlementError, requireAuthenticatedUser } from '@/lib/entitlements';
import { getGeminiClient, UpstreamTimeoutError, withTimeout } from '@/lib/gemini/client';
import {
  buildRoleplaySystemPrompt,
  enforceRoleplayLength,
  formatRecentTranscript,
} from '@/lib/gemini/roleplay';
import type { PressureLevel, TranscriptTurn } from '@/lib/types';

const voiceTurnSchema = z.object({
  sessionId: z.string().uuid(),
  userUtterance: z.string().min(1).max(1200),
});

export async function POST(req: Request) {
  try {
    const user = await requireAuthenticatedUser(req);
    const body = await req.json();
    const parsed = voiceTurnSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'INVALID_PAYLOAD', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { sessionId, userUtterance } = parsed.data;

    const sessionRows = await sql`
      SELECT
        id,
        counterpart_role,
        situation_goal,
        pressure_level,
        voice_persona,
        status,
        transcript
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

    let memorySummary: string | null = null;
    if (user.planTier === 'pro') {
      const memRows = await sql`
        SELECT summary FROM coaching_memories WHERE user_id = ${user.id} LIMIT 1
      `;
      memorySummary = (memRows[0]?.summary as string | undefined) ?? null;
    }

    const existingTranscript = (session.transcript as TranscriptTurn[]) ?? [];
    const nowMs = Date.now();
    const userTurn: TranscriptTurn = {
      turnIndex: existingTranscript.length,
      speaker: 'user',
      text: userUtterance.trim(),
      timestampMs: nowMs,
    };

    const updatedWithUser = [...existingTranscript, userTurn];

    const systemInstruction = buildRoleplaySystemPrompt({
      counterpartRole: session.counterpart_role as string,
      situationGoal: session.situation_goal as string,
      pressureLevel: session.pressure_level as PressureLevel,
      voicePersona: session.voice_persona as string,
      crossSessionMemorySummary: memorySummary,
    });

    const prompt = [
      'RIWAYAT PERCAKAPAN TERAKHIR:',
      formatRecentTranscript(updatedWithUser),
      '',
      'Berikan balasan lisan singkat (maksimal 200 karakter) sebagai lawan bicara:',
    ].join('\n');

    const ai = getGeminiClient();
    const response = await withTimeout(
      () =>
        ai.models.generateContent({
          model: serverConfig.gemini.voiceModel,
          contents: prompt,
          config: {
            systemInstruction,
            temperature: 0.65,
            maxOutputTokens: 120,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      12_000
    );

    const rawReply = response.text ?? '';
    const replyText = enforceRoleplayLength(
      rawReply || 'Bisa Anda jelaskan lebih spesifik poin utamanya?'
    );

    const aiTurn: TranscriptTurn = {
      turnIndex: updatedWithUser.length,
      speaker: 'ai',
      text: replyText,
      timestampMs: Date.now(),
    };

    const finalTranscript = [...updatedWithUser, aiTurn];

    await sql`
      UPDATE sessions
      SET transcript = ${JSON.stringify(finalTranscript)}::jsonb,
          updated_at = NOW()
      WHERE id = ${sessionId}
        AND user_id = ${user.id}
    `;

    return NextResponse.json({
      reply: replyText,
      characterCount: replyText.length,
      turnIndex: aiTurn.turnIndex,
    });
  } catch (error) {
    if (error instanceof EntitlementError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.status }
      );
    }
    if (error instanceof UpstreamTimeoutError) {
      return NextResponse.json(
        {
          error: 'AI_TIMEOUT',
          message: 'Koneksi sedang lambat. Silakan ulangi giliran bicara Anda.',
        },
        { status: 504 }
      );
    }
    console.error('[voice/turn] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Gagal memproses respons suara.' },
      { status: 500 }
    );
  }
}
