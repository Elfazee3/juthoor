'use client';

import { useRef, useState, type PropsWithChildren, type CSSProperties } from 'react';

/**
 * Card with a cursor-following radial spotlight, after React Bits
 * SpotlightCard (MIT). Restyled onto Juthoor's stone/olive tokens.
 */
type SpotlightCardProps = PropsWithChildren<{
  className?: string;
  spotlightColor?: string;
  style?: CSSProperties;
  as?: 'div' | 'article' | 'li';
}>;

export function SpotlightCard({
  children,
  className = '',
  spotlightColor = 'rgba(184, 138, 20, 0.22)',
  style,
  as: Tag = 'div',
}: SpotlightCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  return (
    <Tag
      ref={ref as never}
      onMouseMove={(e) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
      }}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      onFocus={() => setOpacity(1)}
      onBlur={() => setOpacity(0)}
      className={`relative overflow-hidden ${className}`}
      style={style}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 transition-opacity duration-500"
        style={{ opacity, background: `radial-gradient(360px circle at ${pos.x}px ${pos.y}px, ${spotlightColor}, transparent 70%)` }}
      />
      {children}
    </Tag>
  );
}
