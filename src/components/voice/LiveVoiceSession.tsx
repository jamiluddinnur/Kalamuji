'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { GoogleGenAI, Modality, type LiveServerMessage } from '@google/genai';
import {
  AlertTriangle,
  AudioLines,
  CheckCircle2,
  Crown,
  Keyboard,
  Loader2,
  Mic,
  MicOff,
  PhoneCall,
  PhoneOff,
  RotateCcw,
  Send,
  Volume2,
} from 'lucide-react';
import { RealtimeAudioEngine } from '@/lib/audio/live-audio';
import type { TranscriptTurn } from '@/lib/types';

export type VoiceSessionState =
  | 'idle'
  | 'connecting'
  | 'listening'
  | 'ai_speaking'
  | 'evaluating'
  | 'quota_exceeded'
  | 'error';

interface LiveVoiceSessionProps {
  sessionId: string;
  counterpartRole: string;
  situationGoal: string;
  onEvaluationComplete: (evaluationId: string) => void;
  onUpgradeClick: () => void;
  onReportIssueClick: (errorContext: string) => void;
}

interface LiveSessionHandle {
  sendRealtimeInput: (input: {
    audio?: { data: string; mimeType: string };
  }) => void;
  sendClientContent: (input: {
    turns: Array<{ role: string; parts: Array<{ text: string }> }>;
    turnComplete: boolean;
  }) => void;
  close: () => void;
}

export function LiveVoiceSession({
  sessionId,
  counterpartRole,
  situationGoal,
  onEvaluationComplete,
  onUpgradeClick,
  onReportIssueClick,
}: LiveVoiceSessionProps) {
  const [status, setStatus] = useState<VoiceSessionState>('idle');
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [transcript, setTranscript] = useState<TranscriptTurn[]>([]);
  const [liveUserDraft, setLiveUserDraft] = useState('');
  const [liveAiDraft, setLiveAiDraft] = useState('');
  const [textInput, setTextInput] = useState('');
  const [showTextFallback, setShowTextFallback] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [elapsedSec, setElapsedSec] = useState(0);

  const audioEngineRef = useRef<RealtimeAudioEngine | null>(null);
  const liveSessionRef = useRef<LiveSessionHandle | null>(null);
  const transcriptRef = useRef<TranscriptTurn[]>([]);
  const userDraftRef = useRef('');
  const aiDraftRef = useRef('');
  const startedAtRef = useRef<number | null>(null);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  // Session timer starts once connected
  useEffect(() => {
    if (!isConnected) return;
    if (!startedAtRef.current) {
      startedAtRef.current = Date.now();
    }
    const timer = setInterval(() => {
      if (startedAtRef.current) {
        setElapsedSec(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [isConnected]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [transcript, liveUserDraft, liveAiDraft]);

  const disconnectLive = useCallback(async () => {
    try {
      liveSessionRef.current?.close();
    } catch {
      // Ignore close errors
    }
    liveSessionRef.current = null;
    if (audioEngineRef.current) {
      await audioEngineRef.current.destroy();
      audioEngineRef.current = null;
    }
    setIsConnected(false);
    setMicLevel(0);
  }, []);

  useEffect(() => {
    return () => {
      void disconnectLive();
    };
  }, [disconnectLive]);

  const commitDraftTurn = useCallback((speaker: 'user' | 'ai', text: string) => {
    const cleaned = text.trim();
    if (!cleaned) return;
    setTranscript((prev) => {
      const next: TranscriptTurn[] = [
        ...prev,
        {
          turnIndex: prev.length,
          speaker,
          text: cleaned,
          timestampMs: Date.now(),
        },
      ];
      transcriptRef.current = next;
      return next;
    });
  }, []);

  const syncTranscriptToServer = useCallback(
    async (turns: TranscriptTurn[], durationSeconds: number) => {
      if (turns.length === 0) return;
      await fetch('/api/sessions/transcript', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          transcript: turns,
          durationSeconds,
        }),
      });
    },
    [sessionId]
  );

  /**
   * Starts true bidirectional real-time voice conversation using Gemini Live API.
   * Unlocks AudioContext directly inside the tap gesture so mobile Safari/Chrome always plays sound.
   */
  const handleStartRealtimeCall = async () => {
    if (status === 'connecting' || status === 'evaluating') return;

    setStatus('connecting');
    setErrorMessage(null);

    try {
      // 1. Unlock browser AudioContext immediately on user tap
      const engine = new RealtimeAudioEngine();
      await engine.unlockAudio();
      audioEngineRef.current = engine;

      // 2. Request short-lived Ephemeral Token from our Next.js backend
      const tokenRes = await fetch('/api/voice/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      const tokenData = await tokenRes.json();
      if (!tokenRes.ok) {
        if (tokenData.error === 'QUOTA_EXHAUSTED') {
          await engine.destroy();
          setStatus('quota_exceeded');
          setErrorMessage(tokenData.message ?? 'Kuota sesi Anda telah habis.');
          return;
        }
        throw new Error(
          tokenData.message ?? 'Gagal menghubungkan ruang suara real-time.'
        );
      }

      // 3. Connect directly to Gemini Live API using the Ephemeral Token
      const ai = new GoogleGenAI({
        apiKey: String(tokenData.token),
        httpOptions: { apiVersion: 'v1alpha' },
      });

      const liveSession = (await ai.live.connect({
        model: String(tokenData.model),
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: String(tokenData.voiceName || 'Kore'),
              },
            },
          },
          systemInstruction: {
            parts: [{ text: String(tokenData.systemInstruction) }],
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setStatus('listening');
          },
          onmessage: (message: LiveServerMessage) => {
            const serverContent = message.serverContent;
            if (!serverContent) return;

            // Instant barge-in: user interrupted AI speech
            if (serverContent.interrupted) {
              audioEngineRef.current?.stopPlayback();
              if (aiDraftRef.current.trim()) {
                commitDraftTurn('ai', aiDraftRef.current);
                aiDraftRef.current = '';
                setLiveAiDraft('');
              }
              setStatus('listening');
              return;
            }

            // Streaming user speech transcription
            const inText = serverContent.inputTranscription?.text;
            if (inText) {
              userDraftRef.current += inText;
              setLiveUserDraft(userDraftRef.current);
            }

            // Streaming AI speech transcription
            const outText = serverContent.outputTranscription?.text;
            if (outText) {
              if (userDraftRef.current.trim()) {
                commitDraftTurn('user', userDraftRef.current);
                userDraftRef.current = '';
                setLiveUserDraft('');
              }
              aiDraftRef.current += outText;
              setLiveAiDraft(aiDraftRef.current);
            }

            // Streaming native 24kHz PCM audio from Gemini HR persona
            const parts = serverContent.modelTurn?.parts ?? [];
            for (const part of parts) {
              const inlineAudio = part.inlineData;
              if (
                inlineAudio?.data &&
                inlineAudio.mimeType?.toLowerCase().startsWith('audio/pcm')
              ) {
                setStatus('ai_speaking');
                audioEngineRef.current?.enqueuePcm24k(inlineAudio.data, () => {
                  setStatus((curr) => (curr === 'ai_speaking' ? 'listening' : curr));
                });
              }
            }

            // Turn finished: commit transcript cleanly
            if (serverContent.turnComplete) {
              if (userDraftRef.current.trim()) {
                commitDraftTurn('user', userDraftRef.current);
                userDraftRef.current = '';
                setLiveUserDraft('');
              }
              if (aiDraftRef.current.trim()) {
                commitDraftTurn('ai', aiDraftRef.current);
                aiDraftRef.current = '';
                setLiveAiDraft('');
              }
              setStatus((curr) => (curr === 'ai_speaking' ? 'listening' : curr));
            }
          },
          onerror: () => {
            setErrorMessage(
              'Koneksi suara terputus sementara. Ketuk Mulai Ulang atau gunakan Mode Ketik.'
            );
            setStatus('error');
          },
          onclose: () => {
            setIsConnected(false);
          },
        },
      })) as unknown as LiveSessionHandle;

      liveSessionRef.current = liveSession;

      // 4. Start live 16kHz PCM microphone streaming to Gemini
      await engine.startMicCapture(
        (base64Pcm16) => {
          liveSessionRef.current?.sendRealtimeInput({
            audio: {
              data: base64Pcm16,
              mimeType: 'audio/pcm;rate=16000',
            },
          });
        },
        (level) => setMicLevel(level)
      );

      // 5. Trigger the AI HR counterpart to greet you out loud immediately
      liveSession.sendClientContent({
        turns: [
          {
            role: 'user',
            parts: [
              {
                text: 'Halo, saya sudah siap. Silakan sapa dan mulai sesi percakapan sesuai peran Anda.',
              },
            ],
          },
        ],
        turnComplete: true,
      });
    } catch (err) {
      await disconnectLive();
      const rawMsg = err instanceof Error ? err.message : '';
      if (rawMsg.toLowerCase().includes('permission') || rawMsg.toLowerCase().includes('notallowed')) {
        setErrorMessage(
          'Izin mikrofon ditolak. Aktifkan izin mikrofon di browser Anda lalu coba lagi.'
        );
      } else {
        setErrorMessage(
          rawMsg || 'Gagal memulai percakapan suara real-time. Anda bisa coba lagi atau pakai Mode Ketik.'
        );
      }
      setStatus('error');
    }
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audioEngineRef.current?.setMuted(nextMuted);
    if (nextMuted) setMicLevel(0);
  };

  // Optional text fallback (also works mid-call or if mic is unavailable)
  const handleSendTextFallback = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = textInput.trim();
    if (!cleaned || status === 'evaluating') return;

    setTextInput('');
    setErrorMessage(null);

    if (isConnected && liveSessionRef.current) {
      commitDraftTurn('user', cleaned);
      liveSessionRef.current.sendClientContent({
        turns: [{ role: 'user', parts: [{ text: cleaned }] }],
        turnComplete: true,
      });
      return;
    }

    // Fallback to server turn endpoint if live WebSocket isn't connected
    commitDraftTurn('user', cleaned);
    setStatus('ai_speaking');
    try {
      const res = await fetch('/api/voice/turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, userUtterance: cleaned }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message ?? 'Gagal memproses pesan.');
      }
      commitDraftTurn('ai', String(data.reply ?? ''));
      setStatus('idle');
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Gagal mengirim pesan.');
      setStatus('error');
    }
  };

  const handleFinishSession = async () => {
    if (status === 'evaluating') return;

    // Commit any remaining live drafts
    if (userDraftRef.current.trim()) {
      commitDraftTurn('user', userDraftRef.current);
      userDraftRef.current = '';
      setLiveUserDraft('');
    }
    if (aiDraftRef.current.trim()) {
      commitDraftTurn('ai', aiDraftRef.current);
      aiDraftRef.current = '';
      setLiveAiDraft('');
    }

    await disconnectLive();
    setStatus('evaluating');
    setErrorMessage(null);

    try {
      // Sync live WebSocket transcript to Neon before running 4-indicator evaluation
      const finalTurns = transcriptRef.current;
      await syncTranscriptToServer(finalTurns, elapsedSec);

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
          : 'Evaluasi tertunda karena jaringan. Ketuk Selesai lagi untuk mencoba ulang.'
      );
    }
  };

  const userTurnCount = transcript.filter((t) => t.speaker === 'user').length;
  const formattedTime = `${String(Math.floor(elapsedSec / 60)).padStart(2, '0')}:${String(
    elapsedSec % 60
  ).padStart(2, '0')}`;

  return (
    <div className="flex min-h-[calc(100dvh-2rem)] flex-col justify-between gap-4 py-3">
      {/* Header */}
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
          <StatusIndicator status={status} isMuted={isMuted} />

          <button
            type="button"
            onClick={() => setShowTextFallback((v) => !v)}
            className="tap-scale inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-ink-primary"
          >
            <Keyboard className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span>{showTextFallback ? 'Tutup Ketik' : 'Mode Ketik'}</span>
          </button>
        </div>
      </header>

      {/* Live Transcript Area */}
      <main className="flex-1 space-y-3 overflow-y-auto px-0.5 py-1">
        {transcript.length === 0 && !isConnected && !liveAiDraft && !liveUserDraft && (
          <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-surface-border bg-surface-card/60 px-6 py-10 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-900">
              <PhoneCall className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <h2 className="mt-4 text-sm font-bold text-ink-primary">
              Siap Mulai Percakapan Suara Real-Time?
            </h2>
            <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-ink-secondary">
              Ketuk tombol hijau di bawah untuk menyalakan mikrofon dan mendengar suara langsung
              dari <span className="font-semibold text-ink-primary">{counterpartRole}</span>.
              Anda bisa langsung berbicara alami dan memotong pembicaraan kapan saja.
            </p>
          </div>
        )}

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

        {liveUserDraft && (
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-2xl rounded-br-md border border-brand-100 bg-brand-50 px-3.5 py-2.5 text-sm italic text-brand-900">
              {liveUserDraft}
            </div>
          </div>
        )}

        {liveAiDraft && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl rounded-bl-md border border-surface-border bg-surface-subtle px-3.5 py-2.5 text-sm italic text-ink-secondary">
              {liveAiDraft}
            </div>
          </div>
        )}

        <div ref={transcriptEndRef} />
      </main>

      {/* Quota / Error States */}
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
              onClick={() => void handleStartRealtimeCall()}
              className="tap-scale inline-flex min-h-[36px] items-center gap-1 rounded-lg bg-white px-2.5 font-semibold text-ink-primary ring-1 ring-surface-border"
            >
              <RotateCcw className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span>Sambungkan Ulang</span>
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

      {/* Optional Text Fallback */}
      {showTextFallback && status !== 'quota_exceeded' && (
        <form onSubmit={handleSendTextFallback} className="flex items-center gap-2">
          <input
            type="text"
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Ketik jawaban Anda..."
            disabled={status === 'evaluating'}
            className="min-h-[44px] flex-1 rounded-xl border border-surface-border bg-surface-card px-3 text-sm text-ink-primary focus:border-brand-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!textInput.trim() || status === 'evaluating'}
            className="tap-scale flex h-[44px] w-[44px] items-center justify-center rounded-xl bg-brand-900 text-white disabled:bg-surface-border"
            aria-label="Kirim teks"
          >
            <Send className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </form>
      )}

      {/* Single-Hand Thumb-Zone Control Dock */}
      <footer className="rounded-3xl border border-surface-border bg-surface-card p-4 shadow-floating">
        {/* Lightweight GPU-composited audio level bar */}
        {isConnected && (
          <div className="mb-3 flex h-5 items-center justify-center gap-1">
            {[0.4, 0.75, 1, 0.75, 0.4].map((weight, idx) => {
              const scale =
                status === 'ai_speaking'
                  ? 0.35 + weight * 0.55
                  : Math.max(0.18, Math.min(1, micLevel * weight * 1.4));
              return (
                <span
                  key={idx}
                  className={`h-full w-1.5 rounded-full transition-transform duration-micro ease-out ${
                    status === 'ai_speaking' ? 'bg-brand-500' : 'bg-semantic-positive'
                  }`}
                  style={{ transform: `scaleY(${scale})` }}
                />
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <div className="w-20 text-left">
            <p className="text-[11px] font-medium text-ink-muted">Giliran</p>
            <p className="font-mono text-sm font-semibold text-ink-primary">{userTurnCount}x</p>
          </div>

          {!isConnected ? (
            <button
              type="button"
              onClick={() => void handleStartRealtimeCall()}
              disabled={status === 'connecting' || status === 'evaluating' || status === 'quota_exceeded'}
              className="tap-scale flex h-16 flex-1 max-w-[220px] items-center justify-center gap-2 rounded-full bg-semantic-positive px-5 text-sm font-semibold text-white shadow-floating hover:opacity-95 disabled:bg-surface-border disabled:text-ink-muted"
            >
              {status === 'connecting' ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.75} />
                  <span>Menghubungkan...</span>
                </>
              ) : (
                <>
                  <PhoneCall className="h-5 w-5" strokeWidth={1.75} />
                  <span>Mulai Bicara</span>
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleToggleMute}
                aria-label={isMuted ? 'Nyalakan mikrofon' : 'Bisukan mikrofon'}
                className={`tap-scale flex h-14 w-14 items-center justify-center rounded-full border transition-colors duration-micro ease-out ${
                  isMuted
                    ? 'border-red-200 bg-red-50 text-semantic-critical'
                    : 'border-surface-border bg-surface-subtle text-ink-primary'
                }`}
              >
                {isMuted ? (
                  <MicOff className="h-6 w-6" strokeWidth={1.75} />
                ) : (
                  <Mic className="h-6 w-6" strokeWidth={1.75} />
                )}
              </button>

              <button
                type="button"
                onClick={() => void disconnectLive()}
                aria-label="Jeda panggilan suara"
                className="tap-scale flex h-14 w-14 items-center justify-center rounded-full bg-semantic-critical text-white"
              >
                <PhoneOff className="h-6 w-6" strokeWidth={1.75} />
              </button>
            </div>
          )}

          <div className="flex w-20 justify-end">
            <button
              type="button"
              onClick={() => void handleFinishSession()}
              disabled={userTurnCount === 0 || status === 'evaluating'}
              className="tap-scale inline-flex min-h-[40px] items-center gap-1 rounded-xl border border-surface-border bg-surface-subtle px-3 text-xs font-semibold text-ink-primary hover:bg-brand-50 hover:text-brand-900 disabled:opacity-40"
            >
              {status === 'evaluating' ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.75} />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" strokeWidth={1.75} />
              )}
              <span>Selesai</span>
            </button>
          </div>
        </div>

        <p className="mt-2.5 text-center text-[11px] text-ink-muted">
          {status === 'connecting'
            ? 'Menyiapkan saluran suara real-time Gemini...'
            : status === 'ai_speaking'
              ? 'Lawan bicara sedang berbicara — Anda bisa langsung menyela'
              : status === 'evaluating'
                ? 'Menyusun evaluasi 4 indikator komunikasi...'
                : isConnected
                  ? isMuted
                    ? 'Mikrofon dibisukan — ketuk ikon mikrofon untuk bicara'
                    : 'Percakapan aktif — langsung berbicara secara natural'
                  : 'Ketuk Mulai Bicara untuk percakapan suara dua arah'}
        </p>
      </footer>
    </div>
  );
}

function StatusIndicator({
  status,
  isMuted,
}: {
  status: VoiceSessionState;
  isMuted: boolean;
}) {
  if (status === 'listening' && isMuted) {
    return (
      <div className="inline-flex items-center gap-2 text-xs font-semibold text-ink-muted">
        <span className="h-2 w-2 rounded-full bg-ink-muted" />
        <MicOff className="h-3.5 w-3.5" strokeWidth={1.75} />
        <span>Mikrofon Dibisukan</span>
      </div>
    );
  }

  const config: Record<
    VoiceSessionState,
    { label: string; dotClass: string; textClass: string }
  > = {
    idle: { label: 'Siap Terhubung', dotClass: 'bg-brand-500', textClass: 'text-ink-secondary' },
    connecting: {
      label: 'Menghubungkan Suara...',
      dotClass: 'bg-semantic-caution',
      textClass: 'text-semantic-caution',
    },
    listening: {
      label: 'Tersambung · Mendengarkan',
      dotClass: 'bg-semantic-positive',
      textClass: 'text-semantic-positive',
    },
    ai_speaking: {
      label: 'Lawan Bicara Sedang Berbicara',
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
      {status === 'ai_speaking' && <Volume2 className="h-3.5 w-3.5" strokeWidth={1.75} />}
      <span>{current.label}</span>
    </div>
  );
}
