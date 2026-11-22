import Link from 'next/link';
import { ArrowLeft, Mic } from 'lucide-react';
import { LoginForm } from '@/components/auth/LoginForm';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode } = await searchParams;
  const defaultTab = mode === 'admin' ? 'admin' : 'user';

  return (
    <main className="flex flex-1 flex-col items-center justify-center py-10">
      <div className="mb-6 flex w-full max-w-sm items-center justify-between">
        <Link
          href="/"
          className="tap-scale inline-flex items-center gap-1.5 text-xs font-semibold text-ink-secondary hover:text-ink-primary"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span>Beranda</span>
        </Link>

        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-900">
          <Mic className="h-3.5 w-3.5 text-brand-700" strokeWidth={1.75} />
          <span>Kalamuji</span>
        </div>
      </div>

      <LoginForm defaultTab={defaultTab} />
    </main>
  );
}
