'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
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

/** Lightweight bilingual content page (Why / How / Contact — flows 2.2–2.4). */
export function InfoPage({ content }: { content: InfoPageContent }) {
  const { t, locale, dir } = useLocale();
  const isAR = locale === 'ar';
  const font = isAR ? 'var(--jt-font-arabic)' : 'var(--jt-font-latin)';

  return (
    <div dir={dir} className="relative bg-[var(--background)] text-[var(--foreground)]">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[360px] bg-[radial-gradient(circle_at_top,_var(--jt-olive-100)_0%,_transparent_60%)] opacity-60" />

      <div className="mx-auto max-w-3xl px-6 pt-24 pb-16">
        <motion.header
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: 'easeOut' }}
          className="mb-10"
        >
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--jt-olive-700)]">
            {t(content.kickerAr, content.kickerEn)}
          </p>
          <h1
            className="text-[clamp(2.2rem,6vw,3.5rem)] font-bold leading-tight text-[var(--jt-olive-900)]"
            style={{ fontFamily: 'var(--jt-font-display)' }}
          >
            {t(content.titleAr, content.titleEn)}
          </h1>
          <p className="mt-4 text-lg text-[var(--jt-stone-700)]" style={{ fontFamily: font, lineHeight: isAR ? 1.9 : 1.65 }}>
            {t(content.leadAr, content.leadEn)}
          </p>
        </motion.header>

        <div className="flex flex-col gap-9">
          {content.sections.map((s, i) => (
            <motion.section
              key={s.hEn}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5, delay: Math.min(i, 4) * 0.05 }}
            >
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
          <div className="mt-12">
            <Link
              href={content.ctaHref}
              className="inline-flex items-center gap-2 rounded-full bg-[var(--jt-olive-700)] px-7 py-3.5 text-sm font-semibold text-[var(--jt-stone-50)] shadow-[var(--jt-shadow-sm)] transition-all hover:-translate-y-0.5 hover:bg-[var(--jt-olive-800)]"
            >
              {t(content.ctaAr, content.ctaEn)}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
