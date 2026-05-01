'use client';

type Value = 'M' | 'F' | null;

export function GenderPicker({
  value,
  onChange,
  labels,
}: {
  value: Value;
  onChange: (v: Value) => void;
  labels: { any: string; male: string; female: string };
}) {
  const btn = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
      active
        ? 'bg-[var(--jt-olive-700)] text-[var(--jt-stone-50)] shadow-sm'
        : 'text-[var(--jt-stone-600)] hover:text-[var(--jt-olive-700)]'
    }`;

  return (
    <div
      role="radiogroup"
      className="inline-flex items-center rounded-full border border-[var(--jt-stone-200)] bg-[var(--jt-stone-50)]/70 p-0.5"
    >
      <button type="button" role="radio" aria-checked={value === null} onClick={() => onChange(null)} className={btn(value === null)}>
        {labels.any}
      </button>
      <button type="button" role="radio" aria-checked={value === 'M'} onClick={() => onChange('M')} className={btn(value === 'M')}>
        {labels.male}
      </button>
      <button type="button" role="radio" aria-checked={value === 'F'} onClick={() => onChange('F')} className={btn(value === 'F')}>
        {labels.female}
      </button>
    </div>
  );
}
