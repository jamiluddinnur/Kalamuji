import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sql } from '@/lib/db';
import { EntitlementError, requireAuthenticatedUser } from '@/lib/entitlements';

const feedbackSchema = z.object({
  sessionId: z.string().uuid().nullable().optional(),
  sentiment: z.enum(['positive', 'neutral', 'negative']),
  quickTag: z.string().max(64).nullable().optional(),
  note: z.string().max(400).nullable().optional(),
});

export async function POST(req: Request) {
  try {
    const user = await requireAuthenticatedUser(req);
    const body = await req.json();
    const parsed = feedbackSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'INVALID_PAYLOAD', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { sessionId = null, sentiment, quickTag = null, note = null } = parsed.data;

    let verifiedSessionId: string | null = null;
    if (sessionId) {
      const owned = await sql`
        SELECT id FROM sessions WHERE id = ${sessionId} AND user_id = ${user.id} LIMIT 1
      `;
      verifiedSessionId = owned.length > 0 ? sessionId : null;
    }

    const inserted = await sql`
      INSERT INTO user_feedback (user_id, session_id, sentiment, quick_tag, note)
      VALUES (${user.id}, ${verifiedSessionId}, ${sentiment}, ${quickTag}, ${note})
      RETURNING id, created_at
    `;

    return NextResponse.json(
      {
        feedbackId: inserted[0].id,
        createdAt: inserted[0].created_at,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof EntitlementError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.status }
      );
    }
    console.error('[feedback] Error:', error);
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Gagal menyimpan masukan.' },
      { status: 500 }
    );
  }
}
