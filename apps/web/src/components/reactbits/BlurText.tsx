'use client';

import { motion, useInView, useReducedMotion, type Transition } from 'framer-motion';
import { useRef, type ElementType } from 'react';

/**
 * Staggered blur-in text, ported from React Bits BlurText (MIT) onto the
 * project's framer-motion install. Splits on spaces by default so Arabic
 * ligatures inside a word are never broken; `animateBy="letters"` is only
 * safe for Latin text.
 */
type BlurTextProps = {
  text: string;
  as?: ElementType;
  className?: string;
  animateBy?: 'words' | 'letters';
  direction?: 'top' | 'bottom';
  /** ms between each segment */
  delay?: number;
  /** seconds per keyframe step */
  stepDuration?: number;
  startDelay?: number;
  once?: boolean;
  style?: React.CSSProperties;
};

export function BlurText({
  text,
  as: Tag = 'p',
  className = '',
  animateBy = 'words',
  direction = 'top',
  delay = 90,
  stepDuration = 0.32,
  startDelay = 0,
  once = true,
  style,
}: BlurTextProps) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once, margin: '-10% 0px' });
  const reduce = useReducedMotion();
  const segments = animateBy === 'words' ? text.split(' ') : Array.from(text);
  const yFrom = direction === 'top' ? -28 : 28;

  if (reduce) {
    return (
      <Tag ref={ref} className={className} style={style}>
        {text}
      </Tag>
    );
  }

  return (
    <Tag ref={ref} className={`${className} flex flex-wrap`} style={style} aria-label={text}>
      {segments.map((seg, i) => {
        const transition: Transition = {
          duration: stepDuration * 2,
          times: [0, 0.55, 1],
          delay: startDelay + (i * delay) / 1000,
          ease: [0.22, 1, 0.36, 1],
        };
        return (
          <motion.span
            key={`${seg}-${i}`}
            aria-hidden
            initial={{ filter: 'blur(12px)', opacity: 0, y: yFrom }}
            animate={inView ? { filter: ['blur(12px)', 'blur(4px)', 'blur(0px)'], opacity: [0, 0.6, 1], y: [yFrom, yFrom * -0.15, 0] } : undefined}
            transition={transition}
            style={{ display: 'inline-block', willChange: 'transform, filter, opacity' }}
          >
            {seg === ' ' ? ' ' : seg}
            {animateBy === 'words' && i < segments.length - 1 ? ' ' : null}
          </motion.span>
        );
      })}
    </Tag>
  );
}
