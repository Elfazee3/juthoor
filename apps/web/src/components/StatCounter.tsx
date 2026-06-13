'use client';

import { animate, useInView, useMotionValue, useTransform } from 'framer-motion';
import { motion } from 'framer-motion';
import { useEffect, useRef } from 'react';

/**
 * Counter that animates from 0 to `value` once the element scrolls into view.
 * `format` lets us keep the "M" suffix or Arabic numerals — tween works on a
 * plain number, the rendered string is derived.
 */
export function StatCounter({
  value,
  format,
  duration = 2.2,
}: {
  value: number;
  format: (n: number) => string;
  duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  const count = useMotionValue(0);
  const text = useTransform(count, (latest) => format(latest));

  useEffect(() => {
    if (!inView) return;
    const controls = animate(count, value, { duration, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [inView, count, value, duration]);

  return <motion.span ref={ref}>{text}</motion.span>;
}
