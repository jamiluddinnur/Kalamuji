import Link from 'next/link';
import {
  ArrowRight,
  Award,
  CheckCircle2,
  Crown,
  Mic,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col justify-center gap-6 py-10">
      {/* Hero Card */}
      <section className="section-reveal space-y-5 rounded-3xl border border-surface-border bg-surface-card p-6 shadow-card">
        <div className="flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-900">
            <Mic className="h-3.5 w-3.5 text-brand-700" strokeWidth={1.75} />
            <span>Kalamuji · Voice Coaching</span>
          </div>

          <Link
            href="/login?mode=admin"
            className="tap-scale inline-flex items-center gap-1 text-xs font-medium text-ink-muted hover:text-ink-primary"
          >
            <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span>Admin</span>
          </Link>
        </div>

        <div className="space-y-2.5">
          <h1 className="text-2xl font-bold leading-snug tracking-tight text-ink-primary sm:text-3xl">
            Latih komunikasi profesional Anda lewat simulasi suara realistis.
          </h1>
          <p className="text-sm leading-relaxed text-ink-secondary">
            Hadapi wawancara kerja, keberatan klien, dan presentasi eksekutif dengan lawan bicara
            AI berbahasa Indonesia serta evaluasi objektif berbasis 4 indikator komunikasi.
          </p>
        </div>

        <div className="flex flex-col gap-2.5 pt-1 sm:flex-row">
          <Link
            href="/login"
            className="tap-scale inline-flex min-h-[50px] flex-1 items-center justify-center gap-2 rounded-2xl bg-brand-900 px-5 text-sm font-semibold text-white shadow-floating hover:bg-brand-700"
          >
            <span>Mulai 5 Sesi Gratis</span>
            <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
          </Link>

          <Link
            href="/dashboard"
            className="tap-scale inline-flex min-h-[50px] items-center justify-center rounded-2xl border border-surface-border bg-surface-subtle px-5 text-sm font-semibold text-ink-primary hover:bg-brand-50 hover:text-brand-900"
          >
            Masuk Dashboard
          </Link>
        </div>
      </section>

      {/* 4 Indicators Preview */}
      <section className="section-reveal rounded-3xl border border-surface-border bg-surface-card p-5 shadow-card">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-ink-muted">
          <Award className="h-4 w-4 text-brand-700" strokeWidth={1.75} />
          <span>4 Indikator Evaluasi Terukur</span>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {[
            { title: 'Clarity & Cognitive Load', desc: 'Struktur jawaban ringkas & mudah dicerna.' },
            { title: 'Relevance & Appropriateness', desc: 'Tepat sasaran sesuai konteks profesional.' },
            { title: 'Persuasion & Credibility', desc: 'Argumen logis dengan bukti konkret.' },
            { title: 'Tone & Composure', desc: 'Tenang, terkontrol, dan tidak defensif.' },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl bg-surface-subtle/70 p-3">
              <p className="text-xs font-semibold text-ink-primary">{item.title}</p>
              <p className="mt-0.5 text-[11px] text-ink-secondary">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Clarity: Free Trial vs Pro */}
      <section className="section-reveal grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-3xl border border-surface-border bg-surface-card p-5 shadow-card">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-secondary">
            <Sparkles className="h-3.5 w-3.5 text-brand-500" strokeWidth={1.75} />
            <span>Uji Coba Gratis</span>
          </div>
          <p className="mt-2 font-mono text-xl font-bold text-ink-primary">Rp0</p>
          <ul className="mt-3 space-y-1.5 text-xs text-ink-secondary">
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-brand-500" strokeWidth={1.75} />
              <span>5 sesi latihan gratis</span>
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-brand-500" strokeWidth={1.75} />
              <span>1 skenario awal (Wawancara Kerja)</span>
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-brand-500" strokeWidth={1.75} />
              <span>Laporan evaluasi 4 indikator</span>
            </li>
          </ul>
        </div>

        <div className="rounded-3xl border border-brand-500 bg-brand-50/40 p-5 shadow-card">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-900">
            <Crown className="h-3.5 w-3.5 text-brand-700" strokeWidth={1.75} />
            <span>Kalamuji Pro</span>
          </div>
          <p className="mt-2 font-mono text-xl font-bold text-brand-900">
            Rp79.000<span className="font-sans text-xs font-normal text-ink-muted">/bulan</span>
          </p>
          <ul className="mt-3 space-y-1.5 text-xs text-ink-primary">
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-brand-700" strokeWidth={1.75} />
              <span>15 sesi latihan per bulan</span>
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-brand-700" strokeWidth={1.75} />
              <span>Semua skenario preset & kustom</span>
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-brand-700" strokeWidth={1.75} />
              <span>Memori coaching lintas sesi</span>
            </li>
          </ul>
        </div>
      </section>
    </main>
  );
}
