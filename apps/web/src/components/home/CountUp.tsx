'use client';

import { animate, useInView, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

type CountUpProps = {
  /** Final numeric value, e.g. 15.2 or 530 */
  value: number;
  /** Decimal places to keep while counting (e.g. 1 for 15.2) */
  decimals?: number;
  /** Rendered after the number, e.g. "M" or "+" */
  suffix?: string;
  /** Seconds the count animation runs */
  duration?: number;
  className?: string;
};

/**
 * Animates a number from 0 to `value` when it scrolls into view.
 * Falls back to rendering the final value immediately when the user
 * prefers reduced motion.
 */
export function CountUp({
  value,
  decimals = 0,
  suffix = '',
  duration = 1.6,
  className,
}: CountUpProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-20px' });
  const reduceMotion = useReducedMotion();
  const [display, setDisplay] = useState(reduceMotion ? value : 0);

  useEffect(() => {
    if (!inView) return;
    if (reduceMotion) {
      setDisplay(value);
      return;
    }
    const controls = animate(0, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (latest) => setDisplay(latest),
    });
    return () => controls.stop();
  }, [inView, reduceMotion, value, duration]);

  return (
    <span ref={ref} className={className} dir="ltr">
      {display.toFixed(decimals)}
      {suffix}
    </span>
  );
}
