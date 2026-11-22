'use client';

import { Crown, Lock, Sparkles } from 'lucide-react';
import type { PlanTier } from '@/lib/config';

interface QuotaBadgeProps {
  planTier: PlanTier;
  remainingSessions: number;
  monthlyQuota: number;
  onUpgradeClick?: () => void;
}

export function QuotaBadge({
  planTier,
  remainingSessions,
  monthlyQuota,
  onUpgradeClick,
}: QuotaBadgeProps) {
  const isPro = planTier === 'pro';
  const isExhausted = remainingSessions <= 0;
  const totalQuota = isPro ? monthlyQuota || 15 : 5;
  const progressPct = Math.min(100, Math.max(0, (remainingSessions / totalQuota) * 100));

  return (
    <section
      aria-label="Status Paket dan Kuota Sesi"
      className="rounded-2xl border border-surface-border bg-surface-card p-4 shadow-card"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-900">
            {isPro ? (
              <>
                <Crown className="h-3.5 w-3.5 text-brand-700" strokeWidth={1.75} />
                <span>Kalamuji Pro</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5 text-brand-500" strokeWidth={1.75} />
                <span>Uji Coba Gratis</span>
              </>
            )}
          </div>

          <p className="text-sm font-semibold text-ink-primary">
            {isPro ? (
              <span className={isExhausted ? 'text-semantic-critical' : 'text-brand-900'}>
                {remainingSessions} / {totalQuota} sesi bulan ini
              </span>
            ) : (
              <span className={isExhausted ? 'text-semantic-critical' : 'text-brand-900'}>
                {remainingSessions} / 5 sesi gratis
              </span>
            )}
          </p>
        </div>

        {!isPro && (
          <button
            type="button"
            onClick={onUpgradeClick}
            className="tap-scale inline-flex min-h-[38px] shrink-0 items-center gap-1.5 rounded-xl bg-brand-900 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700"
          >
            <Crown className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span>Pro · Rp79rb/bln</span>
          </button>
        )}
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-subtle">
        <div
          className={`h-full rounded-full transition-[width] duration-ui ease-out ${
            isExhausted
              ? 'bg-semantic-critical'
              : remainingSessions <= 1
                ? 'bg-semantic-caution'
                : 'bg-brand-500'
          }`}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {isExhausted && (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50/70 p-2.5 text-xs text-semantic-critical">
          <Lock className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
          <p>
            {isPro
              ? 'Kuota 15 sesi bulan ini sudah terpakai. Kuota akan otomatis diperbarui pada siklus tagihan berikutnya.'
              : 'Kuota 5 sesi gratis Anda telah habis. Upgrade ke Kalamuji Pro (Rp79.000/bulan) untuk 15 sesi/bulan, semua skenario, dan memori coaching.'}
          </p>
        </div>
      )}
    </section>
  );
}
