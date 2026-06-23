'use client';

import { motion } from 'framer-motion';
import { Info, ScrollText } from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import type { LegalBlock, LegalDocument, LegalSection } from '@/lib/legal/types';

/**
 * Renders a {@link LegalDocument} (Privacy Policy or Terms & Conditions) bilingually.
 *
 * Each text fragment shows Arabic when the active locale is Arabic AND an Arabic
 * string is supplied; otherwise it falls back to the (authoritative-source) English
 * with `dir="ltr"` so punctuation renders correctly inside an RTL page. When the
 * locale is Arabic, a notice explains that the full official Arabic body is still
 * under legal review — we deliberately do not fabricate binding Arabic legal text.
 */
export function LegalDocumentView({ doc }: { doc: LegalDocument }) {
  const { t, locale, dir } = useLocale();
  const isAR = locale === 'ar';

  return (
    <div dir={dir} className="relative bg-[var(--background)] text-[var(--foreground)]">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--jt-olive-100)_0%,_transparent_55%)] opacity-50" />
      </div>

      {/* Header */}
      <section className="mx-auto max-w-3xl px-6 pt-28 pb-10 text-center">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--jt-olive-200)]/70 bg-[var(--jt-olive-50)]/80 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--jt-olive-700)]">
          <ScrollText className="h-3.5 w-3.5" />
          {t(doc.versionAr, doc.versionEn)} · {t(doc.effectiveAr, doc.effectiveEn)}
        </span>
        <h1
          className="text-[clamp(2.2rem,6vw,4rem)] font-bold leading-tight text-[var(--jt-olive-900)]"
          style={{ fontFamily: 'var(--jt-font-display)' }}
        >
          {t(doc.titleAr, doc.titleEn)}
        </h1>
        <p
          className="mx-auto mt-4 max-w-xl text-[var(--jt-stone-700)]"
          style={{ fontFamily: isAR ? 'var(--jt-font-arabic)' : 'var(--jt-font-latin)', lineHeight: isAR ? 1.9 : 1.6 }}
        >
          {t(doc.subtitleAr, doc.subtitleEn)}
        </p>
      </section>

      {/* Important notice + Arabic-pending notice */}
      <section className="mx-auto max-w-3xl px-6">
        <div className="rounded-2xl border border-[var(--jt-olive-200)]/60 bg-[var(--jt-olive-50)]/50 p-5">
          <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--jt-olive-700)]">
            <Info className="h-4 w-4" />
            {t('إشعار مهمّ', 'Important notice')}
          </div>
          <p
            className="text-sm text-[var(--jt-stone-800)]"
            style={{ fontFamily: isAR ? 'var(--jt-font-arabic)' : 'var(--jt-font-latin)', lineHeight: isAR ? 1.95 : 1.65 }}
          >
            {t(doc.importantNoticeAr, doc.importantNoticeEn)}
          </p>
        </div>

        {isAR && (
          <div className="mt-4 rounded-2xl border border-[var(--jt-gold-300)]/60 bg-[var(--jt-gold-100)]/40 p-4">
            <p className="text-sm text-[var(--jt-stone-800)]" style={{ fontFamily: 'var(--jt-font-arabic)', lineHeight: 1.95 }}>
              النصّ العربي الرسمي الكامل لهذه الوثيقة قيد المراجعة القانونية النهائية. العناوين والملخّصات متوفّرة بالعربية،
              وسيُضاف النصّ التفصيلي الكامل قريبًا — وحتى ذلك الحين يظهر النصّ التفصيلي بالإنجليزية كمصدر مرجعي.
            </p>
          </div>
        )}
      </section>

      {/* Sections */}
      <section className="mx-auto max-w-3xl px-6 py-12">
        <div className="flex flex-col gap-10">
          {doc.sections.map((section, i) => (
            <SectionView key={section.id} section={section} index={i} />
          ))}
        </div>

        <p
          className="mt-14 border-t border-[var(--jt-stone-200)]/60 pt-6 text-center text-sm text-[var(--jt-stone-600)]"
          style={{ fontFamily: isAR ? 'var(--jt-font-arabic)' : 'var(--jt-font-latin)', lineHeight: isAR ? 1.9 : 1.6 }}
        >
          {t(doc.contactAr, doc.contactEn)}
        </p>
      </section>
    </div>
  );
}

function SectionView({ section, index }: { section: LegalSection; index: number }) {
  const { t, locale } = useLocale();
  const isAR = locale === 'ar';

  return (
    <motion.article
      id={section.id}
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.55, delay: Math.min(index, 4) * 0.04 }}
      className="scroll-mt-24"
    >
      <header className="mb-4">
        {(section.numberEn || section.numberAr) && (
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--jt-olive-600)]">
            {t(section.numberAr ?? '', section.numberEn ?? '')}
          </span>
        )}
        <h2
          className="mt-1 text-2xl font-bold text-[var(--jt-olive-900)]"
          style={{ fontFamily: 'var(--jt-font-display)' }}
        >
          {t(section.titleAr, section.titleEn)}
        </h2>
      </header>

      <div className="flex flex-col gap-4">
        {section.blocks.map((block, bi) => (
          <BlockView key={bi} block={block} />
        ))}
      </div>

      {section.summary && (
        <div className="mt-5 rounded-xl border-s-4 border-[var(--jt-olive-500)] bg-[var(--jt-stone-50)]/70 p-4">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--jt-olive-600)]">
            {t('بلغة مبسّطة', 'In simple terms')}
          </div>
          <p
            className="text-sm text-[var(--jt-stone-700)]"
            style={{ fontFamily: isAR ? 'var(--jt-font-arabic)' : 'var(--jt-font-latin)', lineHeight: isAR ? 1.95 : 1.6 }}
          >
            {t(section.summary.ar, section.summary.en)}
          </p>
        </div>
      )}
    </motion.article>
  );
}

/** Pick the string to show and the direction/lang it should render in. */
function useShown() {
  const { locale } = useLocale();
  return (en: string, ar?: string) => {
    if (locale === 'ar' && ar) return { text: ar, dir: 'rtl' as const, lang: 'ar' };
    return { text: en, dir: 'ltr' as const, lang: 'en' };
  };
}

function fontFor(lang: string) {
  return lang === 'ar' ? 'var(--jt-font-arabic)' : 'var(--jt-font-latin)';
}

function BlockView({ block }: { block: LegalBlock }) {
  const shown = useShown();

  if (block.type === 'p') {
    const s = shown(block.en, block.ar);
    return (
      <p
        dir={s.dir}
        className="text-[15px] text-[var(--jt-stone-800)]"
        style={{ fontFamily: fontFor(s.lang), lineHeight: s.lang === 'ar' ? 1.95 : 1.7 }}
      >
        {s.text}
      </p>
    );
  }

  if (block.type === 'list') {
    const ListTag = block.ordered ? 'ol' : 'ul';
    return (
      <ListTag className={`flex flex-col gap-2 ps-5 ${block.ordered ? 'list-decimal' : 'list-disc'}`}>
        {block.items.map((item, i) => {
          const s = shown(item.en, item.ar);
          return (
            <li
              key={i}
              dir={s.dir}
              className="text-[15px] text-[var(--jt-stone-800)] marker:text-[var(--jt-olive-500)]"
              style={{ fontFamily: fontFor(s.lang), lineHeight: s.lang === 'ar' ? 1.9 : 1.65 }}
            >
              {s.text}
            </li>
          );
        })}
      </ListTag>
    );
  }

  if (block.type === 'defs') {
    return (
      <dl className="divide-y divide-[var(--jt-stone-200)]/60 overflow-hidden rounded-xl border border-[var(--jt-stone-200)]/70">
        {block.rows.map((row, i) => {
          const term = shown(row.termEn, row.termAr);
          const def = shown(row.defEn, row.defAr);
          return (
            <div key={i} className="grid gap-1 p-3 sm:grid-cols-[200px_1fr] sm:gap-4">
              <dt
                dir={term.dir}
                className="text-sm font-semibold text-[var(--jt-olive-800)]"
                style={{ fontFamily: fontFor(term.lang) }}
              >
                {term.text}
              </dt>
              <dd
                dir={def.dir}
                className="text-sm text-[var(--jt-stone-700)]"
                style={{ fontFamily: fontFor(def.lang), lineHeight: def.lang === 'ar' ? 1.9 : 1.6 }}
              >
                {def.text}
              </dd>
            </div>
          );
        })}
      </dl>
    );
  }

  // callout
  const toneBorder =
    block.tone === 'terra'
      ? 'border-[var(--jt-terra-200)]/60 bg-[var(--jt-terra-50)]/40'
      : block.tone === 'gold'
        ? 'border-[var(--jt-gold-300)]/60 bg-[var(--jt-gold-100)]/40'
        : 'border-[var(--jt-olive-200)]/60 bg-[var(--jt-olive-50)]/50';
  const title = block.titleEn ? shown(block.titleEn, block.titleAr) : null;
  const body = shown(block.en, block.ar);
  return (
    <div className={`rounded-xl border-s-4 p-4 ${toneBorder}`}>
      {title && (
        <div
          dir={title.dir}
          className="mb-1 text-sm font-bold text-[var(--jt-olive-800)]"
          style={{ fontFamily: fontFor(title.lang) }}
        >
          {title.text}
        </div>
      )}
      <p
        dir={body.dir}
        className="text-sm text-[var(--jt-stone-800)]"
        style={{ fontFamily: fontFor(body.lang), lineHeight: body.lang === 'ar' ? 1.95 : 1.65 }}
      >
        {body.text}
      </p>
    </div>
  );
}
