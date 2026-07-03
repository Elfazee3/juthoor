'use client';

import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import { useRef, type CSSProperties } from 'react';

type ScrollWordsProps = {
  text: string;
  className?: string;
  style?: CSSProperties;
};

/**
 * Scroll-linked word reveal: each word brightens from dim to full as the
 * paragraph travels through the viewport — scrubbing follows the scroll in
 * both directions. Splits on spaces only, so Arabic ligatures inside a word
 * are never broken. Renders plain text under prefers-reduced-motion.
 */
export function ScrollWords({ text, className, style }: ScrollWordsProps) {
  const ref = useRef<HTMLParagraphElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.92', 'start 0.35'],
  });
  const words = text.split(' ');

  if (reduce) {
    return (
      <p ref={ref} className={className} style={style}>
        {text}
      </p>
    );
  }

  return (
    <p ref={ref} className={className} style={style}>
      {words.map((word, i) => (
        <Word
          key={i}
          progress={scrollYProgress}
          range={[i / words.length, Math.min(1, (i + 1) / words.length)]}
        >
          {word}
        </Word>
      ))}
    </p>
  );
}

function Word({
  progress,
  range,
  children,
}: {
  progress: MotionValue<number>;
  range: [number, number];
  children: string;
}) {
  const opacity = useTransform(progress, range, [0.14, 1]);
  return (
    <>
      <motion.span style={{ opacity }} className="inline-block">
        {children}
      </motion.span>{' '}
    </>
  );
}
