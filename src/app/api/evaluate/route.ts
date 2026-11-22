import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sql } from '@/lib/db';
import { EntitlementError, requireAuthenticatedUser } from '@/lib/entitlements';
import { UpstreamTimeoutError } from '@/lib/gemini/client';
import { evaluateSessionTranscript } from '@/lib/gemini/evaluator';
import { finalizeSessionAtomically } from '@/lib/session-completion';
import type { TranscriptTurn } from '@/lib/types';

const evaluateSchema = z.object({
  sessionId: z.string().uuid(),
  durationSeconds: z.number().int().min(0).max(3600).default(0),
});

export async function POST(req: Request) {
  try {
    const user = await requireAuthenticatedUser(req);
    const body = await req.json();
    const parsed = evaluateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'INVALID_PAYLOAD', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { sessionId, durationSeconds } = parsed.data;

    const sessionRows = await sql`
      SELECT id, counterpart_role, situation_goal, pressure_level, status, transcript
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

    if (session.status === 'completed') {
      const existingEval = await sql`
        SELECT * FROM evaluations WHERE session_id = ${sessionId} AND user_id = ${user.id} LIMIT 1
      `;
      if (existingEval.length > 0) {
        return NextResponse.json({
          evaluation: existingEval[0],
          remainingSessions: user.remainingSessions,
          idempotent: true,
        });
      }
    }

    const transcript = (session.transcript as TranscriptTurn[]) ?? [];
    const userTurns = transcript.filter((t) => t.speaker === 'user');
    if (userTurns.length === 0) {
      return NextResponse.json(
        {
          error: 'EMPTY_TRANSCRIPT',
          message: 'Sesi belum memiliki rekaman bicara pengguna untuk dievaluasi.',
        },
        { status: 400 }
      );
    }

    const computed = await evaluateSessionTranscript({
      counterpartRole: session.counterpart_role as string,
      situationGoal: session.situation_goal as string,
      pressureLevel: session.pressure_level as string,
      transcript,
    });

    const result = await finalizeSessionAtomically({
      sessionId,
      userId: user.id,
      durationSeconds,
      evaluation: computed,
      updateMemory: user.planTier === 'pro',
    });

    return NextResponse.json({
      evaluationId: result.evaluationId,
      evaluation: computed,
      remainingSessions: result.remainingSessions,
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
          error: 'EVALUATOR_TIMEOUT',
          message: 'Evaluasi membutuhkan waktu lebih lama karena jaringan. Silakan coba lagi.',
        },
        { status: 504 }
      );
    }
    if (error instanceof Error && error.message === 'INSUFFICIENT_SESSION_QUOTA') {
      return NextResponse.json(
        { error: 'QUOTA_EXHAUSTED', message: 'Kuota sesi Anda tidak mencukupi.' },
        { status: 403 }
      );
    }
    console.error('[evaluate] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Gagal menyelesaikan evaluasi sesi.' },
      { status: 500 }
    );
  }
}
