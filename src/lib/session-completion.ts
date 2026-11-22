import 'server-only';
import { withTransaction } from './db';
import type { ComputedEvaluation } from './gemini/evaluator';

interface WeaknessCounter {
  tag: string;
  count: number;
}

function buildCompactMemorySummary(
  weaknesses: WeaknessCounter[],
  latestImprovement: string,
  sessionsCount: number
): string {
  const topTags = weaknesses
    .slice(0, 3)
    .map((w) => `${w.tag} (${w.count}x)`)
    .join(', ');

  const parts = [
    `Sesi selesai: ${sessionsCount}.`,
    topTags ? `Pola perbaikan utama: ${topTags}.` : '',
    `Fokus terakhir: ${latestImprovement}`,
  ].filter(Boolean);

  return parts.join(' ').slice(0, 350);
}

export async function finalizeSessionAtomically(params: {
  sessionId: string;
  userId: string;
  durationSeconds: number;
  evaluation: ComputedEvaluation;
  updateMemory: boolean;
}) {
  return withTransaction(async (client) => {
    const sessionRes = await client.query<{ id: string }>(
      `
      UPDATE sessions
      SET status = 'completed',
          duration_seconds = $3,
          completed_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
        AND user_id = $2
        AND status = 'active'
      RETURNING id
      `,
      [params.sessionId, params.userId, Math.max(0, Math.round(params.durationSeconds))]
    );

    if (sessionRes.rowCount === 0) {
      throw new Error('SESSION_ALREADY_COMPLETED_OR_NOT_FOUND');
    }

    const quotaRes = await client.query<{ remaining_sessions: number }>(
      `
      UPDATE users
      SET remaining_sessions = remaining_sessions - 1,
          updated_at = NOW()
      WHERE id = $1
        AND remaining_sessions > 0
      RETURNING remaining_sessions
      `,
      [params.userId]
    );

    if (quotaRes.rowCount === 0) {
      throw new Error('INSUFFICIENT_SESSION_QUOTA');
    }

    const evalRes = await client.query<{ id: string }>(
      `
      INSERT INTO evaluations (
        session_id,
        user_id,
        clarity,
        relevance,
        persuasion,
        tone_composure,
        overall_score,
        strongest_point,
        priority_improvement,
        better_phrasing_example,
        recurring_weakness_tag
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id
      `,
      [
        params.sessionId,
        params.userId,
        params.evaluation.clarity,
        params.evaluation.relevance,
        params.evaluation.persuasion,
        params.evaluation.toneComposure,
        params.evaluation.overallScore,
        params.evaluation.strongestPoint,
        params.evaluation.priorityImprovement,
        params.evaluation.betterPhrasingExample,
        params.evaluation.recurringWeaknessTag,
      ]
    );

    if (params.updateMemory) {
      const memRes = await client.query<{
        recurring_weaknesses: WeaknessCounter[];
        notable_strengths: string[];
        sessions_analyzed_count: number;
      }>(
        `
        SELECT recurring_weaknesses, notable_strengths, sessions_analyzed_count
        FROM coaching_memories
        WHERE user_id = $1
        FOR UPDATE
        `,
        [params.userId]
      );

      const existing = memRes.rows[0];
      const weaknesses: WeaknessCounter[] = Array.isArray(existing?.recurring_weaknesses)
        ? [...existing.recurring_weaknesses]
        : [];
      const strengths: string[] = Array.isArray(existing?.notable_strengths)
        ? [...existing.notable_strengths]
        : [];
      const nextCount = (existing?.sessions_analyzed_count ?? 0) + 1;

      if (params.evaluation.recurringWeaknessTag) {
        const idx = weaknesses.findIndex(
          (w) => w.tag === params.evaluation.recurringWeaknessTag
        );
        if (idx >= 0) {
          weaknesses[idx] = {
            ...weaknesses[idx],
            count: weaknesses[idx].count + 1,
          };
        } else {
          weaknesses.push({ tag: params.evaluation.recurringWeaknessTag, count: 1 });
        }
      }

      const cappedWeaknesses = weaknesses
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      const cappedStrengths = [
        params.evaluation.strongestPoint.slice(0, 140),
        ...strengths,
      ].slice(0, 3);

      const compactSummary = buildCompactMemorySummary(
        cappedWeaknesses,
        params.evaluation.priorityImprovement,
        nextCount
      );

      await client.query(
        `
        INSERT INTO coaching_memories (
          user_id,
          summary,
          recurring_weaknesses,
          notable_strengths,
          last_session_id,
          sessions_analyzed_count
        )
        VALUES ($1, $2, $3::jsonb, $4::jsonb, $5, $6)
        ON CONFLICT (user_id) DO UPDATE SET
          summary = EXCLUDED.summary,
          recurring_weaknesses = EXCLUDED.recurring_weaknesses,
          notable_strengths = EXCLUDED.notable_strengths,
          last_session_id = EXCLUDED.last_session_id,
          sessions_analyzed_count = EXCLUDED.sessions_analyzed_count,
          updated_at = NOW()
        `,
        [
          params.userId,
          compactSummary,
          JSON.stringify(cappedWeaknesses),
          JSON.stringify(cappedStrengths),
          params.sessionId,
          nextCount,
        ]
      );
    }

    return {
      evaluationId: evalRes.rows[0].id,
      overallScore: params.evaluation.overallScore,
      remainingSessions: quotaRes.rows[0].remaining_sessions,
    };
  });
}
