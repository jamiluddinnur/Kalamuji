'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { LiveVoiceSession } from './LiveVoiceSession';
import { ProductFeedbackWidget } from '@/components/feedback/ProductFeedbackWidget';

interface SessionClientProps {
  sessionId: string;
  counterpartRole: string;
  situationGoal: string;
}

export function SessionClient({
  sessionId,
  counterpartRole,
  situationGoal,
}: SessionClientProps) {
  const router = useRouter();
  const [issueContext, setIssueContext] = useState<string | null>(null);

  return (
    <>
      <LiveVoiceSession
        sessionId={sessionId}
        counterpartRole={counterpartRole}
        situationGoal={situationGoal}
        onEvaluationComplete={() => router.push(`/report/${sessionId}`)}
        onUpgradeClick={() => router.push('/dashboard')}
        onReportIssueClick={(context) => setIssueContext(context)}
      />

      {issueContext !== null && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink-primary/40 p-4 sm:items-center"
        >
          <div className="w-full max-w-sm space-y-2 rounded-3xl bg-surface-canvas p-3 shadow-floating">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIssueContext(null)}
                aria-label="Tutup laporan kendala"
                className="rounded-lg p-1 text-ink-muted hover:text-ink-primary"
              >
                <X className="h-4 w-4" strokeWidth={1.75} />
              </button>
            </div>
            <ProductFeedbackWidget
              sessionId={sessionId}
              defaultOpenErrorReport
              initialErrorNote={issueContext}
            />
          </div>
        </div>
      )}
    </>
  );
}
