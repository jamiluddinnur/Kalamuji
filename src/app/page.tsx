import Link from 'next/link';
import { ArrowRight, Mic, ShieldCheck } from 'lucide-react';

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col justify-center py-12">
      <div className="space-y-5 rounded-3xl border border-surface-border bg-surface-card p-6 shadow-card">
        <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-900">
          <Mic className="h-3.5 w-3.5 text-brand-700" strokeWidth={1.75} />
          <span>Kalamuji · Pelatih Komunikasi Suara</span>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-ink-primary">
          Latih wawancara kerja, presentasi, dan negosiasi secara realistis.
        </h1>

        <p className="text-sm leading-relaxed text-ink-secondary">
          Mulai dengan 5 sesi gratis pada skenario awal Anda, atau upgrade ke Kalamuji Pro
          (Rp79.000/bulan) untuk 15 sesi/bulan, skenario kustom, dan memori coaching lintas sesi.
        </p>

        <div className="flex flex-col gap-2.5 pt-2 sm:flex-row">
          <Link
            href="/dashboard"
            className="tap-scale inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-900 px-5 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <span>Mulai Latihan</span>
            <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
          </Link>

          <Link
            href="/admin"
            className="tap-scale inline-flex min-h-[48px] items-center justify-center gap-1.5 rounded-2xl border border-surface-border bg-surface-subtle px-4 text-xs font-semibold text-ink-secondary hover:text-ink-primary"
          >
            <ShieldCheck className="h-4 w-4" strokeWidth={1.75} />
            <span>Admin</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
