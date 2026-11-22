'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Brain, Crown, X } from 'lucide-react';
import type { PlanTier } from '@/lib/config';
import { QuotaBadge } from './QuotaBadge';
import { ScenarioSelector, type StartSessionPayload } from './ScenarioSelector';

interface DashboardClientProps {
  userEmail: string;
  planTier: PlanTier;
  trialScenario: string;
  remainingSessions: number;
  monthlyQuota: number;
  memorySummary: string | null;
}

export function DashboardClient({
  userEmail,
  planTier,
  trialScenario,
  remainingSessions,
  monthlyQuota,
  memorySummary,
}: DashboardClientProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const handleStartSession = async (payload: StartSessionPayload) => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/sessions/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (
          data.error === 'QUOTA_EXHAUSTED' ||
          data.error === 'TRIAL_SCENARIO_LOCKED' ||
          data.error === 'PRO_REQUIRED_CUSTOM_SCENARIO'
        ) {
          setShowUpgradeModal(true);
        }
        throw new Error(data.message ?? 'Gagal memulai sesi latihan.');
      }

      router.push(`/session/${data.session.id}`);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Terjadi kesalahan saat memulai sesi.'
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 py-6">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-ink-primary">Ruang Latihan Kalamuji</h1>
          <p className="text-xs text-ink-muted">{userEmail}</p>
        </div>
      </header>

      <QuotaBadge
        planTier={planTier}
        remainingSessions={remainingSessions}
        monthlyQuota={monthlyQuota}
        onUpgradeClick={() => setShowUpgradeModal(true)}
      />

      {planTier === 'pro' && memorySummary && (
        <section className="rounded-2xl border border-brand-100 bg-brand-50/50 p-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-900">
            <Brain className="h-4 w-4 text-brand-700" strokeWidth={1.75} />
            <span>Memori Coaching Lintas Sesi</span>
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-ink-secondary">{memorySummary}</p>
        </section>
      )}

      {errorMessage && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-xs text-semantic-critical">
          {errorMessage}
        </div>
      )}

      <ScenarioSelector
        planTier={planTier}
        trialScenario={trialScenario}
        remainingSessions={remainingSessions}
        isSubmitting={isSubmitting}
        onStartSession={handleStartSession}
        onUpgradeClick={() => setShowUpgradeModal(true)}
      />

      {showUpgradeModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink-primary/40 p-4 sm:items-center"
        >
          <div className="w-full max-w-sm rounded-3xl border border-surface-border bg-surface-card p-5 shadow-floating">
            <div className="flex items-start justify-between gap-3">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-900">
                <Crown className="h-3.5 w-3.5 text-brand-700" strokeWidth={1.75} />
                <span>Kalamuji Pro</span>
              </div>
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                aria-label="Tutup"
                className="rounded-lg p-1 text-ink-muted hover:text-ink-primary"
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>

            <h2 className="mt-3 text-base font-bold text-ink-primary">
              Rp79.000 / bulan · 15 sesi latihan
            </h2>
            <ul className="mt-2.5 space-y-1.5 text-xs text-ink-secondary">
              <li>• Akses penuh semua skenario preset (Wawancara, Keberatan, Pitching)</li>
              <li>• Buat skenario kustom sesuai peran dan target Anda</li>
              <li>• Memori coaching lintas sesi untuk memantau perkembangan</li>
            </ul>

            <button
              type="button"
              onClick={() => setShowUpgradeModal(false)}
              className="tap-scale mt-4 flex min-h-[44px] w-full items-center justify-center rounded-xl bg-brand-900 px-4 text-xs font-semibold text-white hover:bg-brand-700"
            >
              Hubungi Billing / Lanjutkan Upgrade
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
