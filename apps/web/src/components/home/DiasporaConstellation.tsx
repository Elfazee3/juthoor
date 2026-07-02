'use client';

import { motion, useInView, useReducedMotion } from 'framer-motion';
import { useRef } from 'react';

/** Scatter positions in viewBox units (200 × 80). */
const POINTS: Array<[number, number]> = [
  [20, 18], [52, 46], [82, 24], [110, 53], [140, 32], [170, 19],
  [32, 61], [122, 13], [180, 50], [70, 66], [156, 59], [98, 37],
];

/** The "origin" point the arcs radiate from (Haifa). */
const ANCHOR: [number, number] = [128, 26];

/** Indices of POINTS that get an arc from the anchor. */
const ARC_TARGETS = [0, 3, 5, 6, 9, 10];

function arcPath([ax, ay]: [number, number], [bx, by]: [number, number]) {
  const midX = (ax + bx) / 2;
  const lift = Math.min(ay, by) - Math.abs(ax - bx) * 0.22 - 6;
  return `M ${ax} ${ay} Q ${midX} ${lift}, ${bx} ${by}`;
}

/**
 * Abstract diaspora map: an anchor "village" dot with flight-path arcs
 * drawing outward to scattered family dots that pulse softly.
 */
export function DiasporaConstellation({ className }: { className?: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const reduceMotion = useReducedMotion();

  return (
    <svg
      ref={ref}
      viewBox="0 0 200 80"
      preserveAspectRatio="xMidYMid slice"
      className={className}
      aria-hidden
    >
      {/* faint cartographic dot grid */}
      <defs>
        <pattern id="jt-map-grid" width="10" height="10" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.45" fill="var(--jt-stone-300)" opacity="0.35" />
        </pattern>
      </defs>
      <rect width="200" height="80" fill="url(#jt-map-grid)" />

      {/* flight-path arcs from the anchor village */}
      {ARC_TARGETS.map((t, i) => (
        <motion.path
          key={t}
          d={arcPath(ANCHOR, POINTS[t])}
          fill="none"
          stroke="var(--jt-gold-400)"
          strokeWidth="0.7"
          strokeLinecap="round"
          strokeOpacity="0.55"
          initial={{ pathLength: reduceMotion ? 1 : 0 }}
          animate={inView ? { pathLength: 1 } : undefined}
          transition={{ duration: 1.3, delay: 0.25 + i * 0.18, ease: 'easeInOut' }}
        />
      ))}

      {/* scattered family dots */}
      {POINTS.map(([x, y], i) => (
        <g key={i}>
          {!reduceMotion && (
            <motion.circle
              cx={x}
              cy={y}
              r={1.6}
              fill="none"
              stroke="var(--jt-terra-400)"
              strokeWidth="0.5"
              initial={{ opacity: 0 }}
              animate={inView ? { r: [1.6, 5.5], opacity: [0.55, 0] } : undefined}
              transition={{
                duration: 2.6,
                delay: 1 + i * 0.22,
                repeat: Infinity,
                repeatDelay: 1.2,
                ease: 'easeOut',
              }}
            />
          )}
          <motion.circle
            cx={x}
            cy={y}
            r={1.6}
            fill="var(--jt-terra-500)"
            initial={{ scale: reduceMotion ? 1 : 0, opacity: reduceMotion ? 1 : 0 }}
            animate={inView ? { scale: 1, opacity: 1 } : undefined}
            transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.15 + i * 0.08 }}
            style={{ transformOrigin: `${x}px ${y}px` }}
          />
        </g>
      ))}

      {/* the anchor village — gold, slightly larger */}
      <motion.circle
        cx={ANCHOR[0]}
        cy={ANCHOR[1]}
        r={2.6}
        fill="var(--jt-gold-400)"
        stroke="#fff"
        strokeWidth="0.7"
        initial={{ scale: reduceMotion ? 1 : 0 }}
        animate={inView ? { scale: 1 } : undefined}
        transition={{ type: 'spring', stiffness: 220, damping: 14, delay: 0.1 }}
        style={{ transformOrigin: `${ANCHOR[0]}px ${ANCHOR[1]}px` }}
      />
    </svg>
  );
}
