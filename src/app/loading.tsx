export default function Loading() {
  return (
    <main className="flex-1 space-y-4 py-8" aria-busy="true" aria-label="Memuat halaman">
      <div className="h-7 w-44 animate-pulse rounded-xl bg-surface-subtle" />
      <div className="h-24 w-full animate-pulse rounded-2xl bg-surface-subtle" />
      <div className="space-y-2.5">
        <div className="h-16 w-full animate-pulse rounded-2xl bg-surface-subtle" />
        <div className="h-16 w-full animate-pulse rounded-2xl bg-surface-subtle" />
        <div className="h-16 w-full animate-pulse rounded-2xl bg-surface-subtle" />
      </div>
    </main>
  );
}
