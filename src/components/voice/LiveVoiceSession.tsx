'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  AudioLines,
  CheckCircle2,
  Crown,
  Keyboard,
  Loader2,
  Mic,
  MicOff,
  RotateCcw,
  Send,
  Square,
  Volume2,
} from 'lucide-react';
import type { TranscriptTurn } from '@/lib/types';

export type VoiceSessionState =
  | 'idle'
  | 'listening'
  | 'ai_speaking'
  | 'evaluating'
  | 'quota_exceeded'
  | 'error';

interface LiveVoiceSessionProps {
  sessionId: string;
  counterpartRole: string;
  situationGoal: string;
  initialPrompt?: string;
  onEvaluationComplete: (evaluationId: string) => void;
  onUpgradeClick: () => void;
  onReportIssueClick: (errorContext: string) => void;
}

interface BrowserSpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
}

export function LiveVoiceSession({
  sessionId,
  counterpartRole,
  situationGoal,
  initialPrompt = 'Halo, silakan perkenalkan singkat latar belakang Anda dan tujuan diskusi kita hari ini.',
  onEvaluationComplete,
  onUpgradeClick,
  onReportIssueClick,
}: LiveVoiceSessionProps) {
  const [status, setStatus] = useState<VoiceSessionState>('idle');
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([
    { turnIndex: 0, speaker: 'ai', text: initialPrompt, timestampMs: Date.now() },
  ]);
  const [liveDraft, setLiveDraft] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showTextFallback, setShowTextFallback] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const startedAtRef = useRef<number>(Date.now());
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [transcript, liveDraft]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const speakIndonesian = useCallback((text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setStatus('idle');
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 1.02;

    utterance.onstart = () => setStatus('ai_speaking');
    utterance.onend = () => setStatus('idle');
    utterance.onerror = () => setStatus('idle');

    setStatus('ai_speaking');
    window.speechSynthesis.speak(utterance);
  }, []);

  const sendUtterance = useCallback(
    async (spokenText: string) => {
      const cleaned = spokenText.trim();
      if (!cleaned) {
        setStatus('idle');
        return;
      }

      setErrorMessage(null);
      setLiveDraft('');
      setTranscript((prev) => [
        ...prev,
        {
          turnIndex: prev.length,
          speaker: 'user',
          text: cleaned,
          timestampMs: Date.now(),
        },
      ]);

      setStatus('ai_speaking');

      try {
        const res = await fetch('/api/voice/turn', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, userUtterance: cleaned }),
        });

        const data = await res.json();

        if (!res.ok) {
          if (data.error === 'QUOTA_EXHAUSTED') {
            setStatus('quota_exceeded');
            setErrorMessage(data.message ?? 'Kuota sesi Anda telah habis.');
            return;
          }
          throw new Error(data.message ?? 'Gagal menerima balasan dari lawan bicara.');
        }

        const aiReply = String(data.reply ?? '');
        setTranscript((prev) => [
          ...prev,
          {
            turnIndex: prev.length,
            speaker: 'ai',
            text: aiReply,
            timestampMs: Date.now(),
          },
        ]);

        speakIndonesian(aiReply);
      } catch (err) {
        setStatus('error');
        setErrorMessage(
          err instanceof Error
            ? err.message
            : 'Koneksi sedang tidak stabil. Coba ulangi giliran bicara Anda.'
        );
      }
    },
    [sessionId, speakIndonesian]
  );

  const handleToggleMic = () => {
    if (status === 'ai_speaking' || status === 'evaluating' || status === 'quota_exceeded') {
      return;
    }

    if (status === 'listening') {
      recognitionRef.current?.stop();
      setStatus('idle');
      return;
    }

    const SpeechRecognitionCtor =
      typeof window !== 'undefined'
        ? ((window as unknown as Record<string, unknown>).SpeechRecognition ??
          (window as unknown as Record<string, unknown>).webkitSpeechRecognition)
        : null;

    if (!SpeechRecognitionCtor) {
      setShowTextFallback(true);
      setErrorMessage(
        'Browser ini belum mendukung pengenalan suara otomatis. Gunakan mode ketik cepat di bawah.'
      );
      setStatus('error');
      return;
    }

    const recognition = new (SpeechRecognitionCtor as new () => BrowserSpeechRecognition)();
    recognition.lang = 'id-ID';
    recognition.interimResults = true;
    recognition.continuous = false;

    let finalSpoken = '';

    recognition.onresult = (event) => {
      let combined = '';
      for (let i = 0; i < event.results.length; i += 1) {
        combined += event.results[i][0].transcript;
      }
      finalSpoken = combined;
      setLiveDraft(combined);
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed') {
        setErrorMessage('Izin mikrofon ditolak. Aktifkan izin mikrofon di pengaturan browser.');
      } else {
        setErrorMessage('Suara tidak tertangkap jelas. Ketuk mikrofon untuk mencoba lagi.');
      }
      setStatus('error');
    };

    recognition.onend = () => {
      recognitionRef.current = null;
      if (finalSpoken.trim().length > 0) {
        void sendUtterance(finalSpoken);
      } else {
        setStatus((curr) => (curr === 'listening' ? 'idle' : curr));
      }
    };

    recognitionRef.current = recognition;
    setErrorMessage(null);
    setLiveDraft('');
    setStatus('listening');
    recognition.start();
  };

  const handleFinishSession = async () => {
    if (status === 'evaluating') return;
    recognitionRef.current?.stop();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    setStatus('evaluating');
    setErrorMessage(null);

    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          durationSeconds: elapsedSec,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'QUOTA_EXHAUSTED') {
          setStatus('quota_exceeded');
          setErrorMessage(data.message ?? 'Kuota sesi tidak mencukupi.');
          return;
        }
        throw new Error(data.message ?? 'Gagal menyelesaikan evaluasi sesi.');
      }

      onEvaluationComplete(data.evaluationId ?? data.evaluation?.id ?? sessionId);
    } catch (err) {
      setStatus('error');
      setErrorMessage(
        err instanceof Error
          ? err.message
          : 'Evaluasi tertunda karena jaringan. Ketuk selesai lagi untuk mencoba ulang.'
      );
    }
  };

  const userTurnCount = transcript.filter((t) => t.speaker === 'user').length;
  const formattedTime = `${String(Math.floor(elapsedSec / 60)).padStart(2, '0')}:${String(
    elapsedSec % 60
  ).padStart(2, '0')}`;

  return (
    <div className="flex min-h-[calc(100dvh-2rem)] flex-col justify-between gap-4 py-3">
      <header className="rounded-2xl border border-surface-border bg-surface-card p-3.5 shadow-card">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink-primary">{counterpartRole}</p>
            <p className="truncate text-xs text-ink-muted">{situationGoal}</p>
          </div>
          <span className="shrink-0 rounded-lg bg-surface-subtle px-2.5 py-1 font-mono text-xs font-medium text-ink-secondary">
            {formattedTime}
          </span>
        </div>

        <div className="mt-2.5 flex items-center justify-between border-t border-surface-border pt-2.5">
          <StatusIndicator status={status} />

          <button
            type="button"
            onClick={() => setShowTextFallback((v) => !v)}
            className="tap-scale inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-ink-primary"
            aria-label="Alihkan mode ketik cadangan"
          >
            <Keyboard className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span>{showTextFallback ? 'Sembunyikan Ketik' : 'Mode Ketik'}</span>
          </button>
        </div>
      </header>

      <main className="flex-1 space-y-3 overflow-y-auto px-0.5 py-1">
        {transcript.map((turn) => {
          const isUser = turn.speaker === 'user';
          return (
            <div
              key={`${turn.turnIndex}-${turn.timestampMs}`}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  isUser
                    ? 'rounded-br-md bg-brand-900 text-white'
                    : 'rounded-bl-md border border-surface-border bg-surface-card text-ink-primary shadow-card'
                }`}
              >
                <p>{turn.text}</p>
              </div>
            </div>
          );
        })}

        {liveDraft && (
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-br-md border border-brand-100 bg-brand-50 px-3.5 py-2.5 text-sm italic text-brand-900">
              {liveDraft}
            </div>
          </div>
        )}

        <div ref={transcriptEndRef} />
      </main>

      {status === 'quota_exceeded' && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs text-semantic-critical">
          <p className="font-semibold">Kuota Sesi Tercapai</p>
          <p className="mt-1 leading-relaxed">{errorMessage}</p>
          <button
            type="button"
            onClick={onUpgradeClick}
            className="tap-scale mt-2.5 inline-flex min-h-[40px] w-full items-center justify-center gap-1.5 rounded-xl bg-brand-900 px-3 text-xs font-semibold text-white"
          >
            <Crown className="h-4 w-4" strokeWidth={1.75} />
            <span>Upgrade ke Kalamuji Pro (Rp79.000/bulan)</span>
          </button>
        </div>
      )}

      {status === 'error' && errorMessage && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-semantic-caution">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.75} />
            <p className="leading-relaxed">{errorMessage}</p>
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setErrorMessage(null);
                setStatus('idle');
              }}
              className="tap-scale inline-flex min-h-[36px] items-center gap-1 rounded-lg bg-white px-2.5 font-semibold text-ink-primary ring-1 ring-surface-border"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span>Coba Lagi</span>
            </button>
            <button
              type="button"
              onClick={() => onReportIssueClick(errorMessage)}
              className="tap-scale inline-flex min-h-[36px] items-center rounded-lg px-2.5 font-semibold text-semantic-caution underline underline-offset-2"
            >
              Laporkan Kendala
            </button>
          </div>
        </div>
      )}

      {showTextFallback && status !== 'quota_exceeded' && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendUtterance(liveDraft);
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={liveDraft}
            onChange={(e) => setLiveDraft(e.target.value)}
            placeholder="Ketik jawaban Anda..."
            disabled={status === 'ai_speaking' || status === 'evaluating'}
            className="min-h-[44px] flex-1 rounded-xl border border-surface-border bg-surface-card px-3 text-sm text-ink-primary focus:border-brand-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!liveDraft.trim() || status === 'ai_speaking' || status === 'evaluating'}
            className="tap-scale flex h-[44px] w-[44px] items-center justify-center rounded-xl bg-brand-900 text-white disabled:bg-surface-border"
            aria-label="Kirim teks"
          >
            <Send className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </form>
      )}

      <footer className="rounded-3xl border border-surface-border bg-surface-card p-4 shadow-floating">
        <div className="flex items-center justify-between gap-4">
          <div className="w-20 text-left">
            <p className="text-[11px] font-medium text-ink-muted">Giliran</p>
            <p className="font-mono text-sm font-semibold text-ink-primary">{userTurnCount}x</p>
          </div>

          <button
            type="button"
            onClick={handleToggleMic}
            disabled={
              status === 'ai_speaking' ||
              status === 'evaluating' ||
              status === 'quota_exceeded'
            }
            aria-label={status === 'listening' ? 'Berhenti merekam' : 'Ketuk untuk berbicara'}
            className={`tap-scale relative flex h-16 w-16 items-center justify-center rounded-full transition-[transform,background-color] duration-micro ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ${
              status === 'listening'
                ? 'bg-semantic-critical text-white ring-4 ring-red-100'
                : status === 'ai_speaking' || status === 'evaluating'
                  ? 'bg-surface-subtle text-ink-muted'
                  : 'bg-brand-900 text-white hover:bg-brand-700'
            }`}
          >
            {status === 'listening' ? (
              <Square className="h-6 w-6 fill-current" strokeWidth={1.75} />
            ) : status === 'ai_speaking' ? (
              <Volume2 className="h-6 w-6" strokeWidth={1.75} />
            ) : status === 'evaluating' ? (
              <Loader2 className="h-6 w-6 animate-spin" strokeWidth={1.75} />
            ) : status === 'quota_exceeded' ? (
              <MicOff className="h-6 w-6" strokeWidth={1.75} />
            ) : (
              <Mic className="h-7 w-7" strokeWidth={1.75} />
            )}
          </button>

          <div className="flex w-20 justify-end">
            <button
              type="button"
              onClick={handleFinishSession}
              disabled={userTurnCount === 0 || status === 'evaluating'}
              className="tap-scale inline-flex min-h-[40px] items-center gap-1 rounded-xl border border-surface-border bg-surface-subtle px-3 text-xs font-semibold text-ink-primary hover:bg-brand-50 hover:text-brand-900 disabled:opacity-40"
            >
              <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span>Selesai</span>
            </button>
          </div>
        </div>

        <p className="mt-2.5 text-center text-[11px] text-ink-muted">
          {status === 'listening'
            ? 'Mendengarkan... Ketuk lagi jika selesai berbicara'
            : status === 'ai_speaking'
              ? 'Lawan bicara sedang merespons...'
              : status === 'evaluating'
                ? 'Menyusun evaluasi 4 indikator komunikasi...'
                : 'Ketuk mikrofon untuk mulai berbicara'}
        </p>
      </footer>
    </div>
  );
}

function StatusIndicator({ status }: { status: VoiceSessionState }) {
  const config: Record<
    VoiceSessionState,
    { label: string; dotClass: string; textClass: string }
  > = {
    idle: { label: 'Siap Bicara', dotClass: 'bg-brand-500', textClass: 'text-ink-secondary' },
    listening: {
      label: 'Mendengarkan Suara Anda',
      dotClass: 'bg-semantic-critical',
      textClass: 'text-semantic-critical',
    },
    ai_speaking: {
      label: 'Lawan Bicara Merespons',
      dotClass: 'bg-brand-700',
      textClass: 'text-brand-900',
    },
    evaluating: {
      label: 'Menilai Sesi...',
      dotClass: 'bg-semantic-caution',
      textClass: 'text-semantic-caution',
    },
    quota_exceeded: {
      label: 'Kuota Sesi Habis',
      dotClass: 'bg-semantic-critical',
      textClass: 'text-semantic-critical',
    },
    error: {
      label: 'Gangguan Sementara',
      dotClass: 'bg-semantic-caution',
      textClass: 'text-semantic-caution',
    },
  };

  const current = config[status];

  return (
    <div className={`inline-flex items-center gap-2 text-xs font-semibold ${current.textClass}`}>
      <span className={`h-2 w-2 rounded-full ${current.dotClass}`} />
      {status === 'listening' && <AudioLines className="h-3.5 w-3.5" strokeWidth={1.75} />}
      <span>{current.label}</span>
    </div>
  );
}
