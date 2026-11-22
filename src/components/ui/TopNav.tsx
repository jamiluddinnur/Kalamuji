'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, Mic, ShieldCheck } from 'lucide-react';

interface TopNavProps {
  userEmail?: string | null;
  isAdmin?: boolean;
  currentPath?: 'dashboard' | 'admin' | 'report';
}

export function TopNav({ userEmail, isAdmin = false, currentPath }: TopNavProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <nav className="sticky top-0 z-30 -mx-4 mb-2 border-b border-surface-border bg-surface-canvas/90 px-4 py-3 backdrop-blur-md">
      <div className="flex items-center justify-between gap-2">
        <Link
          href={userEmail ? '/dashboard' : '/'}
          className="tap-scale inline-flex items-center gap-2 text-sm font-bold tracking-tight text-brand-900"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand-900 text-white">
            <Mic className="h-4 w-4" strokeWidth={1.75} />
          </span>
          <span>Kalamuji</span>
        </Link>

        <div className="flex items-center gap-1.5">
          {isAdmin && currentPath !== 'admin' && (
            <Link
              href="/admin"
              className="tap-scale inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-surface-border bg-surface-card px-2.5 text-xs font-semibold text-ink-secondary hover:text-brand-900"
            >
              <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span>Admin</span>
            </Link>
          )}

          {currentPath === 'admin' && (
            <Link
              href="/dashboard"
              className="tap-scale inline-flex min-h-[34px] items-center rounded-lg border border-surface-border bg-surface-card px-2.5 text-xs font-semibold text-ink-secondary hover:text-brand-900"
            >
              Dashboard
            </Link>
          )}

          {userEmail && (
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="tap-scale inline-flex min-h-[34px] items-center gap-1 rounded-lg border border-surface-border bg-surface-card px-2.5 text-xs font-semibold text-ink-secondary hover:border-red-200 hover:text-semantic-critical disabled:opacity-50"
              aria-label="Keluar"
            >
              <LogOut className="h-3.5 w-3.5" strokeWidth={1.75} />
              <span>{loggingOut ? '...' : 'Keluar'}</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
