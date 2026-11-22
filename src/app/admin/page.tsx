import {
  Activity,
  BarChart3,
  Crown,
  Gauge,
  MessageSquareWarning,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
  Users,
} from 'lucide-react';
import { getAdminDashboardMetrics, requireAdminUser } from '@/lib/admin';
import { EntitlementError } from '@/lib/entitlements';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  let adminEmail = '';
  let metrics = null;
  let authError: { status: number; message: string } | null = null;

  try {
    const admin = await requireAdminUser();
    adminEmail = admin.email;
    metrics = await getAdminDashboardMetrics();
  } catch (error) {
    if (error instanceof EntitlementError) {
      authError = { status: error.status, message: error.message };
    } else {
      throw error;
    }
  }

  if (authError || !metrics) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center py-16 text-center">
        <div className="w-full max-w-sm rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-semantic-critical">
            <ShieldCheck className="h-6 w-6" strokeWidth={1.75} />
          </div>
          <h1 className="mt-4 text-base font-bold text-ink-primary">
            {authError?.status === 401 ? 'Autentikasi Diperlukan' : 'Akses Ditolak (403)'}
          </h1>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-secondary">
            {authError?.message ?? 'Anda tidak memiliki izin untuk membuka halaman admin.'}
          </p>
        </div>
      </main>
    );
  }

  const trialPct =
    metrics.quotaUsage.trialAllocatedTotal > 0
      ? Math.round(
          (metrics.quotaUsage.trialUsedTotal / metrics.quotaUsage.trialAllocatedTotal) * 100
        )
      : 0;

  const proPct =
    metrics.quotaUsage.proAllocatedTotal > 0
      ? Math.round(
          (metrics.quotaUsage.proUsedTotal / metrics.quotaUsage.proAllocatedTotal) * 100
        )
      : 0;

  return (
    <main className="space-y-5 py-6">
      {/* Admin Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-surface-border bg-surface-card p-4 shadow-card">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-900">
            <ShieldCheck className="h-3.5 w-3.5 text-brand-700" strokeWidth={1.75} />
            <span>Kalamuji Admin Console</span>
          </div>
          <h1 className="mt-1.5 text-lg font-bold text-ink-primary">
            Ringkasan Operasional & Kualitas
          </h1>
        </div>
        <p className="font-mono text-xs text-ink-muted">{adminEmail}</p>
      </header>

      {/* 1. User Count & Tier Breakdown */}
      <section className="grid grid-cols-3 gap-2.5">
        <div className="rounded-2xl border border-surface-border bg-surface-card p-3.5 shadow-card">
          <div className="flex items-center gap-1.5 text-xs text-ink-muted">
            <Users className="h-4 w-4" strokeWidth={1.75} />
            <span>Total User</span>
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-ink-primary">
            {metrics.users.total}
          </p>
        </div>

        <div className="rounded-2xl border border-surface-border bg-surface-card p-3.5 shadow-card">
          <div className="flex items-center gap-1.5 text-xs text-ink-muted">
            <Activity className="h-4 w-4" strokeWidth={1.75} />
            <span>Free Trial</span>
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-ink-primary">
            {metrics.users.freeTrial}
          </p>
        </div>

        <div className="rounded-2xl border border-surface-border bg-surface-card p-3.5 shadow-card">
          <div className="flex items-center gap-1.5 text-xs text-brand-700">
            <Crown className="h-4 w-4" strokeWidth={1.75} />
            <span>Pro (79rb)</span>
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-brand-900">
            {metrics.users.pro}
          </p>
        </div>
      </section>

      {/* 2. Quota Usage: 5-Session Trial vs 15-Session/Month Pro */}
      <section className="rounded-2xl border border-surface-border bg-surface-card p-4 shadow-card">
        <div className="flex items-center gap-2 text-xs font-semibold text-ink-primary">
          <Gauge className="h-4 w-4 text-brand-700" strokeWidth={1.75} />
          <span>Penggunaan Kuota Sesi</span>
        </div>

        <div className="mt-3 space-y-3">
          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-ink-secondary">
                Free Trial (5 sesi · 1 skenario awal)
              </span>
              <span className="font-mono font-semibold text-ink-primary">
                {metrics.quotaUsage.trialUsedTotal} / {metrics.quotaUsage.trialAllocatedTotal} ({trialPct}%)
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-subtle">
              <div className="h-full rounded-full bg-brand-500" style={{ width: `${trialPct}%` }} />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-ink-secondary">
                Pro Subscription (15 sesi/bulan · Rp79.000)
              </span>
              <span className="font-mono font-semibold text-ink-primary">
                {metrics.quotaUsage.proUsedTotal} / {metrics.quotaUsage.proAllocatedTotal} ({proPct}%)
              </span>
            </div>
            <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-surface-subtle">
              <div className="h-full rounded-full bg-brand-900" style={{ width: `${proPct}%` }} />
            </div>
          </div>
        </div>
      </section>

      {/* 3. Scenario Breakdown & Average 4-Indicator Scores */}
      <section className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-surface-border bg-surface-card p-4 shadow-card">
          <div className="flex items-center gap-2 text-xs font-semibold text-ink-primary">
            <BarChart3 className="h-4 w-4 text-brand-700" strokeWidth={1.75} />
            <span>Distribusi Skenario ({metrics.scenarios.totalSessions} sesi)</span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-surface-subtle p-2.5">
              <p className="text-[11px] text-ink-muted">Preset</p>
              <p className="font-mono text-lg font-bold text-ink-primary">
                {metrics.scenarios.presetCount}
              </p>
            </div>
            <div className="rounded-xl bg-surface-subtle p-2.5">
              <p className="text-[11px] text-ink-muted">Custom (Pro)</p>
              <p className="font-mono text-lg font-bold text-brand-900">
                {metrics.scenarios.customCount}
              </p>
            </div>
          </div>

          {metrics.scenarios.byPresetKey.length > 0 && (
            <ul className="mt-3 space-y-1.5 border-t border-surface-border pt-2.5 text-xs">
              {metrics.scenarios.byPresetKey.map((item) => (
                <li key={item.scenarioKey} className="flex items-center justify-between">
                  <span className="font-mono text-ink-secondary">{item.scenarioKey}</span>
                  <span className="font-mono font-semibold text-ink-primary">{item.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-surface-border bg-surface-card p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-ink-primary">
              Rata-Rata 4 Indikator ({metrics.averageScores.evaluationsCount} evaluasi)
            </span>
            <span className="rounded-lg bg-brand-50 px-2 py-0.5 font-mono text-xs font-bold text-brand-900">
              Overall: {metrics.averageScores.overallScore}
            </span>
          </div>

          <dl className="mt-3 space-y-2 text-xs">
            {[
              { label: 'Clarity & Cognitive Load', val: metrics.averageScores.clarity },
              { label: 'Relevance & Appropriateness', val: metrics.averageScores.relevance },
              { label: 'Persuasion & Credibility', val: metrics.averageScores.persuasion },
              { label: 'Tone & Composure', val: metrics.averageScores.toneComposure },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between">
                <dt className="text-ink-secondary">{row.label}</dt>
                <dd className="font-mono font-semibold text-ink-primary">{row.val}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* 4. Incoming User Product Feedback & Issue Reports */}
      <section className="rounded-2xl border border-surface-border bg-surface-card p-4 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-ink-primary">
            <MessageSquareWarning className="h-4 w-4 text-brand-700" strokeWidth={1.75} />
            <span>Masukan Produk & Laporan Kendala ({metrics.feedback.summary.total})</span>
          </div>
          <div className="flex items-center gap-3 text-xs font-medium">
            <span className="inline-flex items-center gap-1 text-semantic-positive">
              <ThumbsUp className="h-3.5 w-3.5" strokeWidth={1.75} />
              {metrics.feedback.summary.positive}
            </span>
            <span className="inline-flex items-center gap-1 text-semantic-caution">
              <ThumbsDown className="h-3.5 w-3.5" strokeWidth={1.75} />
              {metrics.feedback.summary.negative}
            </span>
          </div>
        </div>

        {metrics.feedback.recent.length === 0 ? (
          <p className="mt-3 text-xs text-ink-muted">Belum ada masukan produk yang masuk.</p>
        ) : (
          <ul className="mt-3 divide-y divide-surface-border">
            {metrics.feedback.recent.map((fb) => (
              <li key={fb.id} className="py-3 first:pt-1 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-mono font-medium text-ink-primary">{fb.userEmail}</span>
                  <div className="flex items-center gap-1.5">
                    {fb.quickTag && (
                      <span className="rounded-full bg-surface-subtle px-2 py-0.5 font-mono text-[11px] text-ink-secondary">
                        {fb.quickTag}
                      </span>
                    )}
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        fb.sentiment === 'positive'
                          ? 'bg-green-50 text-semantic-positive'
                          : fb.sentiment === 'negative'
                            ? 'bg-amber-50 text-semantic-caution'
                            : 'bg-surface-subtle text-ink-secondary'
                      }`}
                    >
                      {fb.sentiment}
                    </span>
                  </div>
                </div>
                {fb.note && (
                  <p className="mt-1 text-xs leading-relaxed text-ink-secondary">{fb.note}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
