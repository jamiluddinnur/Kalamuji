'use client';

import { useRouter } from 'next/navigation';
import { EvaluationReport } from './EvaluationReport';
import { ProductFeedbackWidget } from '@/components/feedback/ProductFeedbackWidget';
import type { SessionEvaluation } from '@/lib/types';

interface ReportClientProps {
  evaluation: SessionEvaluation;
  memorySummary: string | null;
}

export function ReportClient({ evaluation, memorySummary }: ReportClientProps) {
  const router = useRouter();

  return (
    <div className="space-y-5 py-6">
      <header>
        <h1 className="text-lg font-bold text-ink-primary">Hasil Evaluasi Sesi</h1>
        <p className="text-xs text-ink-muted">
          Analisis objektif berbasis 4 indikator komunikasi profesional
        </p>
      </header>

      <EvaluationReport
        evaluation={evaluation}
        memorySummary={memorySummary}
        onPracticeAgain={() => router.push('/dashboard')}
      />

      <ProductFeedbackWidget sessionId={evaluation.sessionId} />
    </div>
  );
}
