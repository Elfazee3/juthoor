'use client';

import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from 'framer-motion';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Infinite marquee whose speed and direction follow the page's scroll
 * velocity. After React Bits ScrollVelocity (MIT), on framer-motion.
 */
type ScrollVelocityProps = {
  children: ReactNode;
  /** px per second at rest; negative reverses */
  baseVelocity?: number;
  copies?: number;
  className?: string;
  rowClassName?: string;
};

export function ScrollVelocity({ children, baseVelocity = 60, copies = 5, className = '', rowClassName = '' }: ScrollVelocityProps) {
  const reduce = useReducedMotion();
  const baseX = useMotionValue(0);
  const { scrollY } = useScroll();
  const velocity = useVelocity(scrollY);
  const smooth = useSpring(velocity, { damping: 50, stiffness: 400 });
  const factor = useTransform(smooth, [0, 1000], [0, 4], { clamp: false });
  const copyRef = useRef<HTMLSpanElement>(null);
  const [copyWidth, setCopyWidth] = useState(0);
  const direction = useRef(1);

  useLayoutEffect(() => {
    const update = () => setCopyWidth(copyRef.current?.offsetWidth ?? 0);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const x = useTransform(baseX, (v) => {
    if (copyWidth === 0) return '0px';
    const range = copyWidth;
    const wrapped = (((v + range) % range) + range) % range;
    return `${wrapped - range}px`;
  });

  useAnimationFrame((_, delta) => {
    if (reduce) return;
    let moveBy = direction.current * baseVelocity * (delta / 1000);
    const f = factor.get();
    if (f < 0) direction.current = -1;
    else if (f > 0) direction.current = 1;
    moveBy += direction.current * moveBy * f;
    baseX.set(baseX.get() - moveBy);
  });

  return (
    <div className={`relative overflow-hidden ${className}`} dir="ltr">
      <motion.div className={`flex whitespace-nowrap ${rowClassName}`} style={{ x }}>
        {Array.from({ length: copies }).map((_, i) => (
          <span key={i} ref={i === 0 ? copyRef : undefined} className="flex shrink-0 items-center">
            {children}
          </span>
        ))}
      </motion.div>
    </div>
  );
}
