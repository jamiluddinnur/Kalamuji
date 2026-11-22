import { notFound, redirect } from 'next/navigation';
import { ReportClient } from '@/components/evaluation/ReportClient';
import { TopNav } from '@/components/ui/TopNav';
import { sql } from '@/lib/db';
import { EntitlementError, requireAuthenticatedUser } from '@/lib/entitlements';
import type { SessionEvaluation } from '@/lib/types';

export const dynamic = 'force-dynamic';

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let user;
  try {
    user = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof EntitlementError) {
      redirect('/login');
    }
    throw error;
  }

  const evalRows = await sql`
    SELECT
      id,
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
      recurring_weakness_tag,
      created_at
    FROM evaluations
    WHERE (session_id = ${id} OR id = ${id})
      AND user_id = ${user.id}
    LIMIT 1
  `;

  if (evalRows.length === 0) {
    notFound();
  }

  const row = evalRows[0];
  const evaluation: SessionEvaluation = {
    id: String(row.id),
    sessionId: String(row.session_id),
    userId: String(row.user_id),
    clarity: Number(row.clarity),
    relevance: Number(row.relevance),
    persuasion: Number(row.persuasion),
    toneComposure: Number(row.tone_composure),
    overallScore: Number(row.overall_score),
    strongestPoint: String(row.strongest_point),
    priorityImprovement: String(row.priority_improvement),
    betterPhrasingExample: String(row.better_phrasing_example),
    recurringWeaknessTag: row.recurring_weakness_tag ? String(row.recurring_weakness_tag) : null,
    createdAt: String(row.created_at),
  };

  let memorySummary: string | null = null;
  if (user.planTier === 'pro') {
    const memRows = await sql`
      SELECT summary FROM coaching_memories WHERE user_id = ${user.id} LIMIT 1
    `;
    memorySummary = (memRows[0]?.summary as string | undefined) ?? null;
  }

  return (
    <main className="flex-1">
      <TopNav
        userEmail={user.email}
        isAdmin={user.role === 'admin'}
        currentPath="report"
      />
      <ReportClient evaluation={evaluation} memorySummary={memorySummary} />
    </main>
  );
}
