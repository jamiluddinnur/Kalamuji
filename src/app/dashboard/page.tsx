import { redirect } from 'next/navigation';
import { DashboardClient } from '@/components/dashboard/DashboardClient';
import { TopNav } from '@/components/ui/TopNav';
import { sql } from '@/lib/db';
import { EntitlementError, requireAuthenticatedUser } from '@/lib/entitlements';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  let user = null;

  try {
    user = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof EntitlementError) {
      redirect('/login');
    }
    throw error;
  }

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
        currentPath="dashboard"
      />
      <DashboardClient
        userEmail={user.email}
        planTier={user.planTier}
        trialScenario={user.trialScenario}
        remainingSessions={user.remainingSessions}
        monthlyQuota={user.monthlyQuota}
        memorySummary={memorySummary}
      />
    </main>
  );
}
