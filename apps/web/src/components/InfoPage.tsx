'use client';

import Link from 'next/link';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { useLocale } from '@/contexts/LocaleContext';

export type InfoSection = {
  hAr: string;
  hEn: string;
  bodyAr: string[];
  bodyEn: string[];
};

export type InfoPageContent = {
  kickerAr: string;
  kickerEn: string;
  titleAr: string;
  titleEn: string;
  leadAr: string;
  leadEn: string;
  sections: InfoSection[];
  ctaAr?: string;
  ctaEn?: string;
  ctaHref?: string;
};

const AR_NUMERALS = ['١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/** Lightweight bilingual content page (Why / How / Contact — flows 2.2–2.4). */
export function InfoPage({ content }: { content: InfoPageContent }) {
  const { t, locale, dir } = useLocale();
  const reduce = useReducedMotion();
  const isAR = locale === 'ar';
  const font = isAR ? 'var(--jt-font-arabic)' : 'var(--jt-font-latin)';

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.1 } },
  };
  const rise: Variants = reduce
    ? {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { duration: 0.4 } },
      }
    : {
        hidden: { opacity: 0, y: 20, filter: 'blur(5px)' },
        show: {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
        },
      };

  return (
    <div dir={dir} className="relative bg-[var(--background)] text-[var(--foreground)]">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[360px] bg-[radial-gradient(circle_at_top,_var(--jt-olive-100)_0%,_transparent_60%)] opacity-60" />
      <div aria-hidden className="jt-tatreez-dark pointer-events-none absolute inset-x-0 top-0 -z-10 h-[240px] opacity-[0.04]" />

      <div className="mx-auto max-w-3xl px-6 pt-24 pb-16">
        <motion.header variants={container} initial="hidden" animate="show" className="mb-12">
          <motion.p
            variants={rise}
            className="mb-3 inline-flex items-center gap-2 rounded-full border border-[var(--jt-olive-200)]/70 bg-[var(--jt-olive-50)]/80 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--jt-olive-700)] shadow-[var(--jt-shadow-sm)]"
          >
            <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[var(--jt-gold-400)]" />
            {t(content.kickerAr, content.kickerEn)}
          </motion.p>
          <motion.h1
            variants={rise}
            className="relative text-[clamp(2.2rem,6vw,3.5rem)] font-bold leading-tight text-[var(--jt-olive-900)]"
            style={{ fontFamily: 'var(--jt-font-display)' }}
          >
            {t(content.titleAr, content.titleEn)}
            <motion.svg
              aria-hidden
              viewBox="0 0 220 10"
              preserveAspectRatio="none"
              className="mt-1 block h-2.5 w-44 max-w-full"
            >
              <motion.path
                d="M4 7 Q 110 1 216 6"
                fill="none"
                stroke="var(--jt-gold-400)"
                strokeWidth="3.5"
                strokeLinecap="round"
                initial={{ pathLength: reduce ? 1 : 0, opacity: reduce ? 1 : 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.55, ease: 'easeOut' }}
              />
            </motion.svg>
          </motion.h1>
          <motion.p
            variants={rise}
            className="mt-4 text-lg text-[var(--jt-stone-700)]"
            style={{ fontFamily: font, lineHeight: isAR ? 1.9 : 1.65 }}
          >
            {t(content.leadAr, content.leadEn)}
          </motion.p>
        </motion.header>

        <div className="flex flex-col gap-10">
          {content.sections.map((s, i) => (
            <motion.section
              key={s.hEn}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 22, filter: 'blur(5px)' }}
              whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.6, delay: Math.min(i, 4) * 0.05, ease: [0.22, 1, 0.36, 1] }}
              className="group relative border-s-2 border-[var(--jt-olive-200)]/60 ps-6 transition-colors duration-500 hover:border-[var(--jt-gold-400)]"
            >
              <span
                aria-hidden
                className="absolute -start-[15px] top-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full border border-[var(--jt-olive-200)] bg-[var(--card)] text-[11px] font-bold text-[var(--jt-olive-700)] shadow-[var(--jt-shadow-sm)] transition-all duration-500 group-hover:border-[var(--jt-gold-400)] group-hover:bg-[var(--jt-gold-50)] group-hover:text-[var(--jt-gold-600)]"
                style={{ fontFamily: 'var(--jt-font-display)' }}
              >
                {isAR ? AR_NUMERALS[i] ?? String(i + 1) : i + 1}
              </span>
              <h2
                className="mb-2 text-2xl font-bold text-[var(--jt-olive-900)]"
                style={{ fontFamily: 'var(--jt-font-display)' }}
              >
                {t(s.hAr, s.hEn)}
              </h2>
              <div className="flex flex-col gap-3">
                {(isAR ? s.bodyAr : s.bodyEn).map((p, j) => (
                  <p key={j} className="text-[15px] text-[var(--jt-stone-800)]" style={{ fontFamily: font, lineHeight: isAR ? 1.95 : 1.7 }}>
                    {p}
                  </p>
                ))}
              </div>
            </motion.section>
          ))}
        </div>

        {content.ctaHref && content.ctaAr && content.ctaEn && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="mt-14"
          >
            <Link
              href={content.ctaHref}
              className="jt-btn-shine inline-flex items-center gap-2 rounded-full bg-[var(--jt-olive-700)] px-7 py-3.5 text-sm font-semibold text-[var(--jt-stone-50)] shadow-[0_10px_24px_-10px_var(--jt-olive-700)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[var(--jt-olive-800)] hover:shadow-[0_14px_28px_-8px_var(--jt-olive-800)]"
            >
              {t(content.ctaAr, content.ctaEn)}
            </Link>
          </motion.div>
        )}
      </div>
    </div>
  );
}
