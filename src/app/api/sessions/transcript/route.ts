import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sql } from '@/lib/db';
import { EntitlementError, requireAuthenticatedUser } from '@/lib/entitlements';

const turnSchema = z.object({
  turnIndex: z.number().int().min(0),
  speaker: z.enum(['user', 'ai']),
  text: z.string().min(1).max(2000),
  timestampMs: z.number().int().min(0),
});

const syncTranscriptSchema = z.object({
  sessionId: z.string().uuid(),
  transcript: z.array(turnSchema).max(200),
  durationSeconds: z.number().int().min(0).max(3600).optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireAuthenticatedUser(req);
    const body = await req.json();
    const parsed = syncTranscriptSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'INVALID_PAYLOAD', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { sessionId, transcript, durationSeconds } = parsed.data;

    const updated = await sql`
      UPDATE sessions
      SET transcript = ${JSON.stringify(transcript)}::jsonb,
          duration_seconds = COALESCE(${durationSeconds ?? null}, duration_seconds),
          updated_at = NOW()
      WHERE id = ${sessionId}
        AND user_id = ${user.id}
        AND status = 'active'
      RETURNING id
    `;

    if (updated.length === 0) {
      return NextResponse.json(
        { error: 'SESSION_NOT_ACTIVE_OR_NOT_FOUND', message: 'Sesi tidak aktif.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, turnsSaved: transcript.length });
  } catch (error) {
    if (error instanceof EntitlementError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.status }
      );
    }
    console.error('[sessions/transcript] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Gagal menyimpan transkrip sesi.' },
      { status: 500 }
    );
  }
}
