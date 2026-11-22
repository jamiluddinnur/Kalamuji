'use client';

import { useState } from 'react';
import {
  Briefcase,
  Crown,
  Gauge,
  Lock,
  MessageSquareQuote,
  Mic,
  Presentation,
  ShieldAlert,
  SlidersHorizontal,
  Volume2,
} from 'lucide-react';
import type { PlanTier } from '@/lib/config';
import type { PressureLevel } from '@/lib/types';

export type PresetKey = 'job_interview' | 'handling_objection' | 'pitch_presentation';

export interface StartSessionPayload {
  scenarioType: 'preset' | 'custom';
  scenarioKey?: PresetKey;
  counterpartRole?: string;
  situationGoal?: string;
  pressureLevel: PressureLevel;
  voicePersona: string;
}

interface ScenarioSelectorProps {
  planTier: PlanTier;
  trialScenario: string;
  remainingSessions: number;
  isSubmitting?: boolean;
  onStartSession: (payload: StartSessionPayload) => Promise<void> | void;
  onUpgradeClick: () => void;
}

const PRESET_CARDS: Array<{
  key: PresetKey;
  title: string;
  subtitle: string;
  icon: typeof Briefcase;
}> = [
  {
    key: 'job_interview',
    title: 'Wawancara Kerja',
    subtitle: 'Jawab pertanyaan kompetensi & pengalaman secara terstruktur.',
    icon: Briefcase,
  },
  {
    key: 'handling_objection',
    title: 'Menangani Keberatan Klien',
    subtitle: 'Redam keberatan harga atau timeline tanpa bersikap defensif.',
    icon: ShieldAlert,
  },
  {
    key: 'pitch_presentation',
    title: 'Presentasi & Pitching',
    subtitle: 'Sampaikan rekomendasi & nilai bisnis di depan pengambil keputusan.',
    icon: Presentation,
  },
];

const VOICE_PERSONAS = [
  {
    id: 'professional_calm',
    label: 'Tenang & Terukur',
    desc: 'HR / Manajer profesional yang objektif',
  },
  {
    id: 'executive_direct',
    label: 'Lugas & Eksekutif',
    desc: 'Direktur yang fokus ke inti & angka',
  },
  {
    id: 'warm_hr',
    label: 'Hangat & Suportif',
    desc: 'Interviewer ramah namun tetap kritis',
  },
] as const;

const PRESSURE_OPTIONS: Array<{ value: PressureLevel; label: string }> = [
  { value: 'low', label: 'Rendah' },
  { value: 'medium', label: 'Sedang' },
  { value: 'high', label: 'Tinggi' },
];

export function ScenarioSelector({
  planTier,
  trialScenario,
  remainingSessions,
  isSubmitting = false,
  onStartSession,
  onUpgradeClick,
}: ScenarioSelectorProps) {
  const isPro = planTier === 'pro';
  const isQuotaExhausted = remainingSessions <= 0;

  const initialPreset: PresetKey =
    trialScenario === 'handling_objection' || trialScenario === 'pitch_presentation'
      ? trialScenario
      : 'job_interview';

  const [mode, setMode] = useState<'preset' | 'custom'>('preset');
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>(initialPreset);
  const [counterpartRole, setCounterpartRole] = useState('');
  const [situationGoal, setSituationGoal] = useState('');
  const [pressureLevel, setPressureLevel] = useState<PressureLevel>('medium');
  const [voicePersona, setVoicePersona] = useState<string>('professional_calm');
  const [lockedNotice, setLockedNotice] = useState<string | null>(null);

  const handleSelectPreset = (key: PresetKey) => {
    if (!isPro && key !== trialScenario) {
      setLockedNotice(
        'Skenario ini terkunci di paket Uji Coba Gratis. Upgrade ke Kalamuji Pro (Rp79.000/bulan) untuk membuka semua skenario & 15 sesi/bulan.'
      );
      return;
    }
    setLockedNotice(null);
    setMode('preset');
    setSelectedPreset(key);
  };

  const handleSelectCustomMode = () => {
    if (!isPro) {
      setLockedNotice(
        'Skenario kustom tersedia khusus untuk pelanggan Kalamuji Pro (Rp79.000/bulan).'
      );
      return;
    }
    setLockedNotice(null);
    setMode('custom');
  };

  const canSubmit =
    !isQuotaExhausted &&
    !isSubmitting &&
    (mode === 'preset' ||
      (counterpartRole.trim().length >= 3 && situationGoal.trim().length >= 5));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    if (mode === 'preset') {
      await onStartSession({
        scenarioType: 'preset',
        scenarioKey: selectedPreset,
        pressureLevel,
        voicePersona,
      });
    } else {
      await onStartSession({
        scenarioType: 'custom',
        counterpartRole: counterpartRole.trim(),
        situationGoal: situationGoal.trim(),
        pressureLevel,
        voicePersona,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-surface-subtle p-1">
        <button
          type="button"
          onClick={() => {
            setLockedNotice(null);
            setMode('preset');
          }}
          className={`tap-scale flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors duration-micro ease-out ${
            mode === 'preset'
              ? 'bg-surface-card text-ink-primary shadow-card'
              : 'text-ink-secondary hover:text-ink-primary'
          }`}
        >
          <MessageSquareQuote className="h-4 w-4" strokeWidth={1.75} />
          <span>Skenario Preset</span>
        </button>

        <button
          type="button"
          onClick={handleSelectCustomMode}
          className={`tap-scale flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors duration-micro ease-out ${
            mode === 'custom'
              ? 'bg-surface-card text-ink-primary shadow-card'
              : 'text-ink-secondary hover:text-ink-primary'
          }`}
        >
          {isPro ? (
            <SlidersHorizontal className="h-4 w-4" strokeWidth={1.75} />
          ) : (
            <Lock className="h-3.5 w-3.5 text-ink-muted" strokeWidth={1.75} />
          )}
          <span>Skenario Kustom</span>
        </button>
      </div>

      {lockedNotice && (
        <div className="flex flex-col gap-2.5 rounded-2xl border border-brand-100 bg-brand-50/70 p-3.5">
          <div className="flex items-start gap-2 text-xs text-brand-900">
            <Crown className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" strokeWidth={1.75} />
            <p className="leading-relaxed">{lockedNotice}</p>
          </div>
          <button
            type="button"
            onClick={onUpgradeClick}
            className="tap-scale inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-xl bg-brand-900 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700"
          >
            <Crown className="h-4 w-4" strokeWidth={1.75} />
            <span>Upgrade ke Kalamuji Pro — Rp79.000/bulan</span>
          </button>
        </div>
      )}

      {mode === 'preset' ? (
        <div className="space-y-2.5" role="radiogroup" aria-label="Pilih Skenario Latihan">
          {PRESET_CARDS.map((card) => {
            const Icon = card.icon;
            const isLocked = !isPro && card.key !== trialScenario;
            const isSelected = selectedPreset === card.key && !isLocked;

            return (
              <button
                key={card.key}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => handleSelectPreset(card.key)}
                className={`interactive-card tap-scale flex w-full items-start gap-3 rounded-2xl border p-3.5 text-left ${
                  isSelected
                    ? 'border-brand-500 bg-brand-50/40 shadow-card'
                    : isLocked
                      ? 'border-surface-border bg-surface-subtle/60 opacity-80'
                      : 'border-surface-border bg-surface-card hover:border-brand-100'
                }`}
              >
                <div
                  className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    isSelected
                      ? 'bg-brand-900 text-white'
                      : 'bg-surface-subtle text-ink-secondary'
                  }`}
                >
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-ink-primary">{card.title}</span>
                    {isLocked && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-surface-card px-2 py-0.5 text-[11px] font-medium text-ink-muted ring-1 ring-surface-border">
                        <Lock className="h-3 w-3" strokeWidth={1.75} />
                        Pro
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-secondary">
                    {card.subtitle}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3 rounded-2xl border border-surface-border bg-surface-card p-4 shadow-card">
          <div>
            <label
              htmlFor="counterpartRole"
              className="block text-xs font-semibold text-ink-primary"
            >
              Peran Lawan Bicara
            </label>
            <input
              id="counterpartRole"
              type="text"
              required
              minLength={3}
              maxLength={120}
              value={counterpartRole}
              onChange={(e) => setCounterpartRole(e.target.value)}
              placeholder="Contoh: VP Engineering saat review promosi"
              className="mt-1.5 min-h-[44px] w-full rounded-xl border border-surface-border bg-surface-canvas px-3 text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="situationGoal"
              className="block text-xs font-semibold text-ink-primary"
            >
              Tujuan Percakapan Anda
            </label>
            <textarea
              id="situationGoal"
              required
              minLength={5}
              maxLength={300}
              rows={3}
              value={situationGoal}
              onChange={(e) => setSituationGoal(e.target.value)}
              placeholder="Contoh: Meyakinkan atasan untuk menyetujui penambahan 2 engineer di kuartal depan."
              className="mt-1.5 w-full resize-none rounded-xl border border-surface-border bg-surface-canvas p-3 text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-primary">
          <Gauge className="h-4 w-4 text-ink-secondary" strokeWidth={1.75} />
          <span>Tingkat Tekanan Lawan Bicara</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {PRESSURE_OPTIONS.map((opt) => {
            const active = pressureLevel === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPressureLevel(opt.value)}
                className={`tap-scale min-h-[40px] rounded-xl border text-xs font-semibold transition-colors duration-micro ease-out ${
                  active
                    ? 'border-brand-500 bg-brand-50 text-brand-900'
                    : 'border-surface-border bg-surface-card text-ink-secondary hover:text-ink-primary'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-primary">
          <Volume2 className="h-4 w-4 text-ink-secondary" strokeWidth={1.75} />
          <span>Persona Suara Lawan Bicara</span>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {VOICE_PERSONAS.map((persona) => {
            const active = voicePersona === persona.id;
            return (
              <button
                key={persona.id}
                type="button"
                onClick={() => setVoicePersona(persona.id)}
                className={`tap-scale rounded-xl border p-2.5 text-left transition-colors duration-micro ease-out ${
                  active
                    ? 'border-brand-500 bg-brand-50/50'
                    : 'border-surface-border bg-surface-card hover:border-brand-100'
                }`}
              >
                <p className="text-xs font-semibold text-ink-primary">{persona.label}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-ink-muted">{persona.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className="tap-scale flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-brand-900 px-5 text-sm font-semibold text-white shadow-floating hover:bg-brand-700 disabled:cursor-not-allowed disabled:bg-surface-border disabled:text-ink-muted disabled:shadow-none"
      >
        <Mic className="h-4 w-4" strokeWidth={1.75} />
        <span>
          {isQuotaExhausted
            ? 'Kuota Sesi Habis'
            : isSubmitting
              ? 'Menyiapkan Ruang Latihan...'
              : 'Mulai Simulasi Suara'}
        </span>
      </button>
    </form>
  );
}
