'use client';

import { useState } from 'react';
import { Check, Flag, Send, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { FeedbackSentiment } from '@/lib/types';

interface ProductFeedbackWidgetProps {
  sessionId?: string | null;
  defaultOpenErrorReport?: boolean;
  initialErrorNote?: string;
}

const QUICK_TAGS = [
  { id: 'helpful_feedback', label: 'Evaluasi relevan' },
  { id: 'realistic_roleplay', label: 'Roleplay realistis' },
  { id: 'voice_latency', label: 'Suara lambat / putus' },
  { id: 'mic_issue', label: 'Kendala mikrofon' },
  { id: 'scenario_request', label: 'Usul skenario baru' },
] as const;

export function ProductFeedbackWidget({
  sessionId = null,
  defaultOpenErrorReport = false,
  initialErrorNote = '',
}: ProductFeedbackWidgetProps) {
  const [sentiment, setSentiment] = useState<FeedbackSentiment | null>(
    defaultOpenErrorReport ? 'negative' : null
  );
  const [quickTag, setQuickTag] = useState<string | null>(
    defaultOpenErrorReport ? 'voice_latency' : null
  );
  const [note, setNote] = useState(initialErrorNote);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sentiment || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          sentiment,
          quickTag,
          note: note.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message ?? 'Gagal mengirim masukan.');
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat mengirim masukan.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-2.5 rounded-2xl border border-green-200 bg-green-50/70 p-4 text-xs text-semantic-positive">
        <Check className="h-4 w-4 shrink-0" strokeWidth={2} />
        <p className="font-medium">
          Terima kasih atas masukan Anda. Tim Kalamuji akan menggunakannya untuk meningkatkan kualitas latihan.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-surface-border bg-surface-card p-4 shadow-card"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-primary">
          {defaultOpenErrorReport && (
            <Flag className="h-3.5 w-3.5 text-semantic-caution" strokeWidth={1.75} />
          )}
          <span>
            {defaultOpenErrorReport
              ? 'Laporkan Kendala Sesi'
              : 'Apakah sesi latihan ini membantu?'}
          </span>
        </div>
        <span className="text-[11px] text-ink-muted">Tidak memotong kuota</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setSentiment('positive')}
          className={`tap-scale flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border text-xs font-semibold transition-colors duration-micro ease-out ${
            sentiment === 'positive'
              ? 'border-brand-500 bg-brand-50 text-brand-900'
              : 'border-surface-border bg-surface-canvas text-ink-secondary'
          }`}
        >
          <ThumbsUp className="h-4 w-4" strokeWidth={1.75} />
          <span>Membantu</span>
        </button>

        <button
          type="button"
          onClick={() => setSentiment('negative')}
          className={`tap-scale flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border text-xs font-semibold transition-colors duration-micro ease-out ${
            sentiment === 'negative'
              ? 'border-semantic-caution bg-amber-50 text-semantic-caution'
              : 'border-surface-border bg-surface-canvas text-ink-secondary'
          }`}
        >
          <ThumbsDown className="h-4 w-4" strokeWidth={1.75} />
          <span>Perlu Perbaikan</span>
        </button>
      </div>

      {sentiment && (
        <div className="mt-3 space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {QUICK_TAGS.map((tag) => {
              const active = quickTag === tag.id;
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => setQuickTag(active ? null : tag.id)}
                  className={`tap-scale rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors duration-micro ease-out ${
                    active
                      ? 'border-brand-500 bg-brand-900 text-white'
                      : 'border-surface-border bg-surface-subtle text-ink-secondary'
                  }`}
                >
                  {tag.label}
                </button>
              );
            })}
          </div>

          <textarea
            rows={2}
            maxLength={400}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Catatan singkat (opsional)..."
            className="w-full resize-none rounded-xl border border-surface-border bg-surface-canvas p-2.5 text-xs text-ink-primary placeholder:text-ink-muted focus:border-brand-500 focus:outline-none"
          />

          {error && <p className="text-xs text-semantic-critical">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="tap-scale inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-xl bg-brand-900 px-3 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            <Send className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span>{submitting ? 'Mengirim...' : 'Kirim Masukan'}</span>
          </button>
        </div>
      )}
    </form>
  );
}
