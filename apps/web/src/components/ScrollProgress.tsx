'use client';

import { motion, useScroll, useSpring } from 'framer-motion';

/**
 * Hair-thin olive progress bar pinned to the top of the viewport. Spring-smoothed
 * so it glides instead of snapping.
 */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 28, restDelta: 0.001 });
  return (
    <motion.div
      aria-hidden
      style={{ scaleX, transformOrigin: '0% 50%' }}
      className="fixed inset-x-0 top-0 z-[60] h-[2px] bg-gradient-to-r from-[var(--jt-olive-500)] via-[var(--jt-gold-400)] to-[var(--jt-olive-500)]"
    />
  );
}
