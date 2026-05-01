'use client';

export function YearRangeInput({
  year,
  window,
  onYear,
  onWindow,
  label,
  hint,
}: {
  year: string;
  window: number;
  onYear: (v: string) => void;
  onWindow: (v: number) => void;
  label: string;
  hint: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--jt-stone-500)]">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="number"
          inputMode="numeric"
          min={1500}
          max={new Date().getUTCFullYear()}
          value={year}
          onChange={(e) => onYear(e.target.value)}
          placeholder="1965"
          className="w-24 rounded-xl border border-[var(--jt-stone-200)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none focus:border-[var(--jt-olive-400)] focus:ring-2 focus:ring-[var(--jt-olive-100)]"
        />
        <span className="text-xs text-[var(--jt-stone-500)]">±</span>
        <input
          type="number"
          min={0}
          max={25}
          value={window}
          onChange={(e) => onWindow(Number(e.target.value))}
          className="w-16 rounded-xl border border-[var(--jt-stone-200)] bg-[var(--background)] px-3 py-2.5 text-sm outline-none focus:border-[var(--jt-olive-400)] focus:ring-2 focus:ring-[var(--jt-olive-100)]"
        />
        <span className="text-[11px] text-[var(--jt-stone-500)]">{hint}</span>
      </div>
    </label>
  );
}
