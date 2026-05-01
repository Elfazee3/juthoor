'use client';

import { GitBranch } from 'lucide-react';

export function DegreeChip({
  degrees,
  label,
  onClick,
  ariaLabel,
}: {
  degrees: number;
  label: string;
  onClick?: (e: React.MouseEvent) => void;
  ariaLabel?: string;
}) {
  const color =
    degrees <= 1
      ? 'var(--jt-olive-700)'
      : degrees <= 2
        ? 'var(--jt-olive-600)'
        : degrees <= 4
          ? 'var(--jt-gold-600)'
          : 'var(--jt-stone-500)';

  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick?.(e);
      }}
      aria-label={ariaLabel ?? label}
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] transition-transform hover:-translate-y-0.5"
      style={{ color, backgroundColor: `color-mix(in srgb, ${color} 12%, transparent)` }}
    >
      <GitBranch className="h-2.5 w-2.5" />
      <span>{degrees}°</span>
      <span className="font-normal opacity-80">· {label}</span>
    </button>
  );
}
