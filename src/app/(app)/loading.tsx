export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-live="polite">
      <span className="sr-only">Carregando…</span>
      <div className="h-8 w-48 animate-pulse rounded bg-foreground/10" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-foreground/10 p-6">
            <div className="h-4 w-20 animate-pulse rounded bg-foreground/10" />
            <div className="mt-3 h-8 w-16 animate-pulse rounded bg-foreground/5" />
          </div>
        ))}
      </div>
    </div>
  );
}
