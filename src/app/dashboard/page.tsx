import { ShieldAlert } from 'lucide-react';
import { DashboardClient } from '@/components/dashboard/DashboardClient';
import { sql } from '@/lib/db';
import { EntitlementError, requireAuthenticatedUser } from '@/lib/entitlements';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  let user = null;
  let authMessage: string | null = null;

  try {
    user = await requireAuthenticatedUser();
  } catch (error) {
    if (error instanceof EntitlementError) {
      authMessage = error.message;
    } else {
      throw error;
    }
  }

  if (!user) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center py-16 text-center">
        <div className="w-full max-w-sm rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-900">
            <ShieldAlert className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <h1 className="mt-4 text-base font-bold text-ink-primary">Silakan Masuk</h1>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-secondary">
            {authMessage ?? 'Sesi pengguna diperlukan untuk mengakses ruang latihan Kalamuji.'}
          </p>
        </div>
      </main>
    );
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
