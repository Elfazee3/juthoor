export function DashboardSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-6 p-6 md:p-10">
      <div className="h-8 w-64 animate-pulse rounded bg-[var(--jt-stone-200)]/60" />
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="h-72 animate-pulse rounded-3xl bg-[var(--jt-stone-200)]/50" />
        <div className="grid gap-6">
          <div className="h-32 animate-pulse rounded-3xl bg-[var(--jt-stone-200)]/50" />
          <div className="h-32 animate-pulse rounded-3xl bg-[var(--jt-stone-200)]/50" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-3xl bg-[var(--jt-stone-200)]/50" />
        ))}
      </div>
    </div>
  );
}
