'use client';

import {
  ArrowRight,
  Award,
  BookOpenCheck,
  Brain,
  CheckCircle2,
  Quote,
  Target,
} from 'lucide-react';
import type { SessionEvaluation } from '@/lib/types';

interface EvaluationReportProps {
  evaluation: SessionEvaluation;
  memorySummary?: string | null;
  onPracticeAgain: () => void;
}

const INDICATOR_META = [
  { key: 'clarity' as const, label: 'Clarity & Cognitive Load', theory: 'Struktur & keringkasan pesan' },
  { key: 'relevance' as const, label: 'Relevance & Appropriateness', theory: 'Ketepatan jawaban & konteks' },
  { key: 'persuasion' as const, label: 'Persuasion & Credibility', theory: 'Kekuatan argumen & bukti' },
  { key: 'toneComposure' as const, label: 'Tone & Composure', theory: 'Ketenangan & kontrol nada' },
];

const WEAKNESS_LABELS: Record<string, string> = {
  rambling_structure: 'Struktur jawaban masih berputar-putar',
  vague_metrics: 'Perlu bukti angka atau contoh konkret',
  off_topic_drift: 'Jawaban sempat melebar dari pertanyaan inti',
  weak_call_to_action: 'Penutup atau ajakan langkah lanjut belum tegas',
  defensive_tone: 'Nada bicara terdengar defensif di bawah tekanan',
  excessive_hedging: 'Terlalu banyak kata ragu-ragu',
  rushed_closing: 'Penutupan jawaban terlalu terburu-buru',
};

function getScoreColor(score: number): string {
  if (score >= 85) return 'text-semantic-positive';
  if (score >= 70) return 'text-brand-900';
  if (score >= 50) return 'text-semantic-caution';
  return 'text-semantic-critical';
}

function getScoreBarColor(score: number): string {
  if (score >= 85) return 'bg-semantic-positive';
  if (score >= 70) return 'bg-brand-500';
  if (score >= 50) return 'bg-semantic-caution';
  return 'bg-semantic-critical';
}

export function EvaluationReport({
  evaluation,
  memorySummary,
  onPracticeAgain,
}: EvaluationReportProps) {
  const weaknessLabel = evaluation.recurringWeaknessTag
    ? (WEAKNESS_LABELS[evaluation.recurringWeaknessTag] ?? evaluation.recurringWeaknessTag)
    : null;

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-surface-border bg-surface-card p-5 shadow-card">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Skor Komunikasi Keseluruhan
            </p>
            <p className="mt-1 text-xs text-ink-secondary">
              Rata-rata terukur dari 4 indikator komunikasi profesional
            </p>
          </div>
          <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-brand-50">
            <span className={`font-mono text-2xl font-bold ${getScoreColor(evaluation.overallScore)}`}>
              {Math.round(evaluation.overallScore)}
            </span>
            <span className="text-[10px] font-medium text-ink-muted">/ 100</span>
          </div>
        </div>
      </section>

      <section
        aria-label="Rincian 4 Indikator Komunikasi"
        className="grid grid-cols-1 gap-2.5 sm:grid-cols-2"
      >
        {INDICATOR_META.map((item) => {
          const value = evaluation[item.key];
          return (
            <div
              key={item.key}
              className="rounded-2xl border border-surface-border bg-surface-card p-3.5 shadow-card"
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-xs font-semibold text-ink-primary">{item.label}</p>
                <span className={`font-mono text-base font-bold ${getScoreColor(value)}`}>
                  {value}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] text-ink-muted">{item.theory}</p>
              <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-subtle">
                <div
                  className={`h-full rounded-full ${getScoreBarColor(value)}`}
                  style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
                />
              </div>
            </div>
          );
        })}
      </section>

      <section className="space-y-2.5">
        <div className="rounded-2xl border border-surface-border bg-surface-card p-4 shadow-card">
          <div className="flex items-center gap-2 text-xs font-semibold text-semantic-positive">
            <Award className="h-4 w-4" strokeWidth={1.75} />
            <span>Kekuatan Utama Anda</span>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-primary">
            {evaluation.strongestPoint}
          </p>
        </div>

        <div className="rounded-2xl border border-surface-border bg-surface-card p-4 shadow-card">
          <div className="flex items-center gap-2 text-xs font-semibold text-semantic-caution">
            <Target className="h-4 w-4" strokeWidth={1.75} />
            <span>Prioritas Perbaikan Berikutnya</span>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-ink-primary">
            {evaluation.priorityImprovement}
          </p>
        </div>

        <div className="rounded-2xl border border-brand-100 bg-brand-50/50 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-900">
            <Quote className="h-4 w-4" strokeWidth={1.75} />
            <span>Contoh Kalimat yang Lebih Tajam</span>
          </div>
          <blockquote className="mt-2 border-l-2 border-brand-500 pl-3 text-sm italic leading-relaxed text-ink-primary">
            &ldquo;{evaluation.betterPhrasingExample}&rdquo;
          </blockquote>
        </div>
      </section>

      {(weaknessLabel || memorySummary) && (
        <section className="rounded-2xl border border-surface-border bg-surface-card p-4 shadow-card">
          <div className="flex items-center gap-2 text-xs font-semibold text-ink-primary">
            <Brain className="h-4 w-4 text-brand-700" strokeWidth={1.75} />
            <span>Fokus Coaching Lintas Sesi</span>
          </div>

          {weaknessLabel && (
            <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-surface-subtle px-3 py-1 text-xs font-medium text-ink-primary">
              <BookOpenCheck className="h-3.5 w-3.5 text-brand-700" strokeWidth={1.75} />
              <span>{weaknessLabel}</span>
            </div>
          )}

          {memorySummary && (
            <p className="mt-2 text-xs leading-relaxed text-ink-secondary">{memorySummary}</p>
          )}
        </section>
      )}

      <button
        type="button"
        onClick={onPracticeAgain}
        className="tap-scale flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-brand-900 px-4 text-sm font-semibold text-white hover:bg-brand-700"
      >
        <CheckCircle2 className="h-4 w-4" strokeWidth={1.75} />
        <span>Latih Sesi Berikutnya</span>
        <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
      </button>
    </div>
  );
}
