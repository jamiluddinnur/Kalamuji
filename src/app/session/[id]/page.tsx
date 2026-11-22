import { notFound, redirect } from 'next/navigation';
import { SessionClient } from '@/components/voice/SessionClient';
import { sql } from '@/lib/db';
import { EntitlementError, requireAuthenticatedUser } from '@/lib/entitlements';

export const dynamic = 'force-dynamic';

export default async function LiveSessionPage({
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
      redirect('/dashboard');
    }
    throw error;
  }

  const rows = await sql`
    SELECT id, counterpart_role, situation_goal, status
    FROM sessions
    WHERE id = ${id}
      AND user_id = ${user.id}
    LIMIT 1
  `;

  if (rows.length === 0) {
    notFound();
  }

  const session = rows[0];
  if (session.status === 'completed') {
    redirect(`/report/${id}`);
  }

  return (
    <SessionClient
      sessionId={String(session.id)}
      counterpartRole={String(session.counterpart_role)}
      situationGoal={String(session.situation_goal)}
    />
  );
}
