'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Loader2,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
  User,
} from 'lucide-react';

interface LoginFormProps {
  defaultTab?: 'user' | 'admin';
}

export function LoginForm({ defaultTab = 'user' }: LoginFormProps) {
  const router = useRouter();
  const [tab, setTab] = useState<'user' | 'admin'>(defaultTab);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const endpoint = tab === 'admin' ? '/api/admin/login' : '/api/auth/login';
      const payload =
        tab === 'admin'
          ? { email: email.trim(), password }
          : { email: email.trim(), fullName: fullName.trim() || undefined };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message ?? 'Gagal masuk. Silakan periksa kembali data Anda.');
      }

      router.push(tab === 'admin' ? '/admin' : '/dashboard');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan jaringan.');
      setLoading(false);
    }
  };

  return (
    <div className="section-reveal w-full max-w-sm rounded-3xl border border-surface-border bg-surface-card p-6 shadow-card">
      {/* Mode Tabs */}
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-subtle p-1">
        <button
          type="button"
          onClick={() => {
            setTab('user');
            setError(null);
          }}
          className={`tap-scale flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors duration-micro ease-out ${
            tab === 'user'
              ? 'bg-surface-card text-ink-primary shadow-card'
              : 'text-ink-secondary hover:text-ink-primary'
          }`}
        >
          <Sparkles className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span>Pengguna</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setTab('admin');
            setError(null);
          }}
          className={`tap-scale flex min-h-[38px] items-center justify-center gap-1.5 rounded-lg text-xs font-semibold transition-colors duration-micro ease-out ${
            tab === 'admin'
              ? 'bg-surface-card text-ink-primary shadow-card'
              : 'text-ink-secondary hover:text-ink-primary'
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span>Admin</span>
        </button>
      </div>

      {/* Heading */}
      <div className="mt-5">
        <h1 className="text-lg font-bold text-ink-primary">
          {tab === 'admin' ? 'Masuk Admin Console' : 'Mulai Latihan di Kalamuji'}
        </h1>
        <p className="mt-1 text-xs leading-relaxed text-ink-secondary">
          {tab === 'admin'
            ? 'Gunakan kredensial admin yang dikonfigurasi di environment variables.'
            : 'Akun baru otomatis mendapat 5 sesi latihan gratis pada skenario wawancara kerja.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
        <div>
          <label htmlFor="login-email" className="block text-xs font-semibold text-ink-primary">
            Email
          </label>
          <div className="relative mt-1.5">
            <Mail
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
              strokeWidth={1.75}
            />
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={tab === 'admin' ? 'admin@kalamuji.id' : 'nama@perusahaan.com'}
              className="min-h-[44px] w-full rounded-xl border border-surface-border bg-surface-canvas pl-9 pr-3 text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>

        {tab === 'user' ? (
          <div>
            <label htmlFor="login-name" className="block text-xs font-semibold text-ink-primary">
              Nama Lengkap <span className="font-normal text-ink-muted">(opsional)</span>
            </label>
            <div className="relative mt-1.5">
              <User
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
                strokeWidth={1.75}
              />
              <input
                id="login-name"
                type="text"
                autoComplete="name"
                maxLength={80}
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Contoh: Budi Santoso"
                className="min-h-[44px] w-full rounded-xl border border-surface-border bg-surface-canvas pl-9 pr-3 text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>
        ) : (
          <div>
            <label htmlFor="login-password" className="block text-xs font-semibold text-ink-primary">
              Kata Sandi Admin
            </label>
            <div className="relative mt-1.5">
              <Lock
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted"
                strokeWidth={1.75}
              />
              <input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi admin"
                className="min-h-[44px] w-full rounded-xl border border-surface-border bg-surface-canvas pl-9 pr-3 text-sm text-ink-primary placeholder:text-ink-muted focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50/80 px-3 py-2 text-xs text-semantic-critical">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="tap-scale flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-brand-900 px-4 text-sm font-semibold text-white shadow-floating hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.75} />
              <span>Memproses...</span>
            </>
          ) : (
            <>
              <span>{tab === 'admin' ? 'Masuk ke Admin Console' : 'Masuk & Mulai Latihan'}</span>
              <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
            </>
          )}
        </button>
      </form>
    </div>
  );
}
