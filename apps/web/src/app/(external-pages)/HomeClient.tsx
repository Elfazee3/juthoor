'use client';

import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  GitBranch,
  Home,
  MapPin,
  Quote,
  ScrollText,
} from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { StatCounter } from '@/components/StatCounter';
import { ScrollProgress } from '@/components/ScrollProgress';

type Village = {
  id: string;
  name_ar: string;
  name_en: string | null;
  district_ar: string | null;
};

const FALLBACK_VILLAGES: Village[] = [
  { id: '1', name_ar: 'اللد', name_en: 'Lydda', district_ar: 'الرملة' },
  { id: '2', name_ar: 'دير ياسين', name_en: 'Deir Yassin', district_ar: 'القدس' },
  { id: '3', name_ar: 'بيسان', name_en: 'Beisan', district_ar: 'بيسان' },
  { id: '4', name_ar: 'صفد', name_en: 'Safad', district_ar: 'صفد' },
  { id: '5', name_ar: 'يافا', name_en: 'Jaffa', district_ar: 'يافا' },
  { id: '6', name_ar: 'حيفا', name_en: 'Haifa', district_ar: 'حيفا' },
  { id: '7', name_ar: 'عكا', name_en: 'Acre', district_ar: 'عكا' },
  { id: '8', name_ar: 'الناصرة', name_en: 'Nazareth', district_ar: 'الناصرة' },
  { id: '9', name_ar: 'الطنطورة', name_en: 'Al-Tantura', district_ar: 'حيفا' },
  { id: '10', name_ar: 'كفر برعم', name_en: 'Kafr Birim', district_ar: 'صفد' },
  { id: '11', name_ar: 'إقرث', name_en: 'Iqrit', district_ar: 'عكا' },
  { id: '12', name_ar: 'الرملة', name_en: 'Ramla', district_ar: 'الرملة' },
];

const TIMELINE: { year: string; ar: string; en: string; }[] = [
  { year: '1517', ar: 'الحكم العثماني يبدأ', en: 'Ottoman rule begins' },
  { year: '1917', ar: 'وعد بلفور', en: 'Balfour Declaration' },
  { year: '1948', ar: 'النكبة — ٧٥٠٬٠٠٠ مُهجَّر', en: 'Nakba — 750,000 displaced' },
  { year: '1967', ar: 'النكسة', en: 'Naksa — Six-Day War displacement' },
  { year: '1982', ar: 'صبرا وشاتيلا', en: 'Sabra & Shatila' },
  { year: '2023', ar: 'غزة — نزوح جماعي', en: 'Gaza — mass displacement' },
  { year: '2026', ar: 'نبدأ بربط الجذور', en: 'We begin reconnecting roots' },
];

const MANIFESTO = [
  { ar: 'الاسم حدود.', en: 'A name is a boundary.' },
  { ar: 'النسب كوكبة.', en: 'A lineage is a constellation.' },
  { ar: 'شجرة العائلة مقاومة.', en: 'A family tree is resistance.' },
  { ar: 'والذاكرة — أرض لا تُحتل.', en: 'And memory — a land that cannot be occupied.' },
];

export function HomeClient({ villages }: { villages: Village[] }) {
  const { t, locale, dir } = useLocale();
  const list = villages.length >= 8 ? villages : FALLBACK_VILLAGES;
  const marquee = [...list, ...list];
  const isAR = locale === 'ar';
  const Arrow = isAR ? ArrowLeft : ArrowRight;

  // Hero parallax
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const heroY = useTransform(heroProgress, [0, 1], ['0%', '30%']);
  const heroOpacity = useTransform(heroProgress, [0, 1], [1, 0.2]);

  return (
    <div dir={dir} className="relative bg-[var(--background)] text-[var(--foreground)]">
      <ScrollProgress />

      {/* Ambient background — noise + two soft gradients */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--jt-olive-100)_0%,_transparent_55%)] opacity-70" />
        <div className="absolute inset-x-0 bottom-0 h-[620px] bg-[radial-gradient(ellipse_at_bottom,_var(--jt-gold-100)_0%,_transparent_60%)] opacity-55" />
        <div
          className="absolute inset-0 opacity-[0.07] mix-blend-multiply"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")",
          }}
        />
      </div>

      {/* ═══════════════════════ 1 ─ HERO (parallax, centered) ══════════════════════ */}
      <section ref={heroRef} className="relative flex min-h-[92vh] items-center justify-center px-6 pt-20 pb-24">
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="flex flex-col items-center text-center">
          {/* Badge removed — let the calligraphy carry the hero alone. */}
          <div className="h-2" aria-hidden />

          {/* Massive calligraphic wordmark */}
          <div className="relative">
            <motion.h1
              initial={{ opacity: 0, scale: 0.94, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 1.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-[clamp(5rem,18vw,13rem)] font-bold leading-none tracking-tight text-[var(--jt-olive-900)]"
              style={{ fontFamily: 'var(--jt-font-display)' }}
            >
              {t('جُذور', 'Juthoor')}
            </motion.h1>
            {/* Underline flourish */}
            <motion.svg
              viewBox="0 0 400 22"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.8, delay: 1.1, ease: 'easeInOut' }}
              className="mx-auto -mt-2 h-5 w-[min(60vw,24rem)] text-[var(--jt-gold-500)]"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <motion.path d="M10 12 C 80 4, 160 20, 240 10 S 380 6, 390 12" />
            </motion.svg>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.3, delay: 0.9, ease: 'easeOut' }}
            className="mt-10 max-w-2xl text-[clamp(1.25rem,2.5vw,1.75rem)] font-normal text-[var(--jt-stone-700)]"
            style={{ fontFamily: 'var(--jt-font-display)', lineHeight: 1.55 }}
          >
            {t(
              'نعيد وصل ١٥٫٢ مليون فلسطيني في الشتات، اسمًا اسمًا، قريةً قريةً.',
              'We reconnect 15.2 million Palestinians in the diaspora, name by name, village by village.',
            )}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 1.4, ease: 'easeOut' }}
            className="mt-12 flex flex-wrap items-center justify-center gap-4"
          >
            <Link
              href="/sign-up"
              className="group inline-flex items-center gap-2 rounded-full bg-[var(--jt-olive-700)] px-8 py-4 text-sm font-semibold text-[var(--jt-stone-50)] shadow-[var(--jt-shadow-lg)] transition-all hover:-translate-y-0.5 hover:bg-[var(--jt-olive-800)]"
            >
              {t('ابدأ شجرتك — مجّانًا', 'Plant your tree — free')}
              <Arrow className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
            </Link>
            <Link
              href="/about"
              className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--jt-olive-800)] underline decoration-[var(--jt-gold-400)] decoration-2 underline-offset-[6px] transition-colors hover:text-[var(--jt-olive-900)]"
            >
              {t('اعرف مهمّتنا', 'Read our mission')}
            </Link>
          </motion.div>

          {/* Scroll cue */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 2.2 }}
            className="mt-16 flex flex-col items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-[var(--jt-stone-500)]"
          >
            {t('مرِّر لتتذكّر', 'Scroll to remember')}
            <motion.span
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              className="inline-block h-8 w-px bg-[var(--jt-stone-300)]"
            />
          </motion.div>
        </motion.div>
      </section>

      {/* ═══════════════════════ 2 ─ STATS ══════════════════════ */}
      <section className="relative border-y border-[var(--jt-olive-200)]/40 bg-[var(--jt-stone-50)]/50 py-20">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 md:grid-cols-3">
          {[
            {
              value: 15.2,
              format: (n: number) => `${n.toFixed(1)}M`,
              labelAr: 'فلسطيني في الشتات',
              labelEn: 'Palestinians in diaspora',
              tint: 'var(--jt-olive-700)',
            },
            {
              value: 530,
              format: (n: number) => Math.round(n).toString(),
              labelAr: 'قرية ومدينة',
              labelEn: 'Villages & cities',
              tint: 'var(--jt-gold-600)',
            },
            {
              value: 1948,
              format: (n: number) => Math.round(n).toString(),
              labelAr: 'العام الذي نرفض أن يُنسى',
              labelEn: 'The year we refuse to forget',
              tint: 'var(--jt-terra-600)',
            },
          ].map((s) => (
            <motion.div
              key={s.labelEn}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
              className="flex flex-col items-center text-center"
            >
              <span
                className="text-[clamp(3.5rem,8vw,6rem)] font-bold leading-none"
                style={{ fontFamily: 'var(--jt-font-display)', color: s.tint }}
              >
                <StatCounter value={s.value} format={s.format} />
              </span>
              <span className="mt-4 max-w-[14rem] text-sm font-semibold uppercase tracking-[0.2em] text-[var(--jt-stone-600)]">
                {t(s.labelAr, s.labelEn)}
              </span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════ 3 ─ VILLAGES MARQUEE ══════════════════════ */}
      <section className="relative bg-[var(--background)] py-10">
        <div className="mb-5 flex items-center justify-center gap-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--jt-stone-500)]">
          <span className="h-px w-10 bg-[var(--jt-stone-300)]" />
          {t('قرى ومدن نحفظ أسماءها', 'Villages & cities we remember')}
          <span className="h-px w-10 bg-[var(--jt-stone-300)]" />
        </div>
        <div className="relative overflow-hidden" style={{ maskImage: 'linear-gradient(to right, transparent, black 8%, black 92%, transparent)' }}>
          <div className="flex gap-3 animate-[marquee_60s_linear_infinite] whitespace-nowrap">
            {marquee.map((v, idx) => (
              <span
                key={`${v.id}-${idx}`}
                className="inline-flex items-center gap-3 rounded-full border border-[var(--jt-stone-200)] bg-[var(--jt-stone-50)] px-5 py-2 text-sm"
              >
                <span
                  className="text-[var(--jt-olive-800)] font-semibold"
                  style={{ fontFamily: 'var(--jt-font-display)' }}
                >
                  {v.name_ar}
                </span>
                {v.name_en && (
                  <span className="text-xs uppercase tracking-[0.18em] text-[var(--jt-stone-500)]">
                    {v.name_en}
                  </span>
                )}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ 4 ─ MANIFESTO (line-by-line reveal) ══════════════════════ */}
      <section className="relative mx-auto max-w-4xl px-6 py-32 text-center">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-10 text-[11px] font-semibold uppercase tracking-[0.35em] text-[var(--jt-olive-700)]"
        >
          {t('بيانُ جذور', 'Our manifesto')}
        </motion.p>
        <div className="flex flex-col gap-6">
          {MANIFESTO.map((line, i) => (
            <motion.p
              key={line.en}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 1.2, delay: i * 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="text-[clamp(1.8rem,4vw,3.2rem)] font-normal leading-[1.35] text-[var(--jt-olive-900)]"
              style={{ fontFamily: 'var(--jt-font-display)' }}
            >
              {t(line.ar, line.en)}
            </motion.p>
          ))}
        </div>
      </section>

      {/* ═══════════════════════ 5 ─ TIMELINE RIBBON ══════════════════════ */}
      <section className="relative border-y border-[var(--jt-olive-200)]/40 bg-[var(--jt-stone-50)]/60 py-20">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--jt-olive-700)]"
          >
            {t('خطّ الذاكرة', 'The thread of memory')}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.9 }}
            className="text-3xl font-bold text-[var(--jt-olive-900)] md:text-4xl"
            style={{ fontFamily: 'var(--jt-font-display)' }}
          >
            {t('من القرية إلى المنفى إلى جذور', 'From village, to exile, to Juthoor')}
          </motion.h2>
        </div>

        <div className="relative mt-14">
          {/* central hairline */}
          <div aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-[var(--jt-olive-300)] to-transparent" />

          <div className="flex gap-6 overflow-x-auto px-[10vw] pb-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" style={{ scrollSnapType: 'x mandatory' }}>
            {TIMELINE.map((m, i) => (
              <motion.div
                key={m.year}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.7, delay: i * 0.05 }}
                style={{ scrollSnapAlign: 'center' }}
                className="relative flex min-w-[240px] flex-col items-center"
              >
                <span className="mb-4 text-4xl font-bold text-[var(--jt-olive-800)]" style={{ fontFamily: 'var(--jt-font-display)' }}>
                  {m.year}
                </span>
                <span className="relative flex h-4 w-4 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--jt-gold-400)] opacity-40" />
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-[var(--jt-gold-500)] ring-4 ring-[var(--jt-stone-50)]" />
                </span>
                <p className="mt-5 max-w-[200px] text-center text-sm text-[var(--jt-stone-700)]" style={{ fontFamily: isAR ? 'var(--jt-font-arabic)' : 'var(--jt-font-latin)', lineHeight: 1.7 }}>
                  {t(m.ar, m.en)}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ 6 ─ PILLARS (centered, compressed) ══════════════════════ */}
      <section className="relative mx-auto max-w-6xl px-6 py-28 text-center">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--jt-olive-700)]"
        >
          {t('ما نبنيه', 'What we build')}
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9 }}
          className="mx-auto max-w-3xl text-4xl font-bold leading-tight text-[var(--jt-olive-900)] md:text-5xl"
          style={{ fontFamily: 'var(--jt-font-display)' }}
        >
          {t('ثلاث أدوات. هدفٌ واحد.', 'Three tools. One purpose.')}
        </motion.h2>
        <div className="mt-14 grid gap-5 md:grid-cols-3">
          {[
            { icon: GitBranch, titleAr: 'منشئ الشجرة', titleEn: 'Tree Builder', descAr: 'ابنِ شجرتك بواجهة عربية ثلاثية الأبعاد.', descEn: 'Build your tree in a 360° Arabic-first interface.', href: '/tree' },
            { icon: Home, titleAr: 'الشجرة الأم', titleEn: 'Mother Tree', descAr: 'شجرة واحدة تجمع كل الفلسطينيين.', descEn: 'One unified tree connecting every Palestinian.', href: '/sign-up' },
            { icon: ScrollText, titleAr: 'أرشيف القرى', titleEn: 'Village Archive', descAr: 'أكثر من ٢٦٣ قرية موثّقة بإحداثياتها.', descEn: '263+ villages documented with coordinates.', href: '/about' },
          ].map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.titleEn}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.6, delay: i * 0.08 }}
              >
                <Link
                  href={p.href}
                  className="group block h-full rounded-3xl border border-[var(--jt-stone-200)] bg-[var(--card)] p-8 text-start shadow-[var(--jt-shadow-sm)] transition-all hover:-translate-y-1 hover:border-[var(--jt-olive-300)] hover:shadow-[var(--jt-shadow-lg)] rtl:text-right"
                >
                  <span className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--jt-olive-700)] text-[var(--jt-stone-50)] transition-colors group-hover:bg-[var(--jt-olive-800)]">
                    <Icon className="h-5 w-5" />
                  </span>
                  <h3 className="mb-2 text-2xl font-bold text-[var(--jt-olive-900)]" style={{ fontFamily: 'var(--jt-font-display)' }}>
                    {t(p.titleAr, p.titleEn)}
                  </h3>
                  <p className="text-[var(--jt-stone-700)]" style={{ fontFamily: isAR ? 'var(--jt-font-arabic)' : 'var(--jt-font-latin)', lineHeight: isAR ? 1.9 : 1.6 }}>
                    {t(p.descAr, p.descEn)}
                  </p>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* ═══════════════════════ 7 ─ ORAL HISTORY QUOTE ══════════════════════ */}
      <section className="relative overflow-hidden bg-[var(--jt-stone-50)]/60 py-28">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative mx-auto max-w-3xl px-6 text-center"
        >
          <Quote className="mx-auto mb-8 h-10 w-10 text-[var(--jt-gold-500)]" aria-hidden />
          <blockquote
            className="text-[clamp(1.6rem,3.5vw,2.6rem)] font-normal leading-[1.55] text-[var(--jt-olive-900)]"
            style={{ fontFamily: 'var(--jt-font-display)' }}
          >
            {t(
              '«ستّي كانت تقول: بيتنا في يافا كان مفتاحه معلّقًا بحبل. لمّا خرجنا، أخذنا المفتاح ونسينا البيت. الآن، نُعيد رسم البيت — بأسمائنا.»',
              '"My grandmother used to say: the key to our home in Jaffa hung on a string. We took the key and forgot the house. Now we are redrawing the house — with our names."',
            )}
          </blockquote>
          <footer className="mt-8 text-xs font-semibold uppercase tracking-[0.3em] text-[var(--jt-stone-500)]">
            {t('— سماء، من جذور', '— Samaa, a Juthoor contributor')}
          </footer>
        </motion.div>
      </section>

      {/* ═══════════════════════ 8 ─ PALESTINE MAP WITH PULSING DOTS ══════════════════════ */}
      <section className="relative mx-auto max-w-5xl px-6 py-24 text-center">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--jt-olive-700)]"
        >
          {t('الأرض تتذكّر', 'The land remembers')}
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9 }}
          className="mx-auto max-w-2xl text-3xl font-bold text-[var(--jt-olive-900)] md:text-4xl"
          style={{ fontFamily: 'var(--jt-font-display)' }}
        >
          {t('كل نقطة عائلة. كل عائلة قصّة.', 'Each dot is a family. Each family, a story.')}
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
          className="relative mx-auto mt-14 aspect-[2/3] w-full max-w-[360px]"
        >
          <svg viewBox="0 0 200 320" className="h-full w-full" fill="none" stroke="currentColor" aria-label="Palestine">
            {/* Historic Palestine — drawn from a simplified Mandate-era trace.
                Coast on the WEST (left), Lebanon top, Syria/Jordan to the
                EAST (right) along the Jordan River + Dead Sea + Wadi Araba,
                Negev tapering to Aqaba at the bottom. */}
            <motion.path
              d="
                M 95 12
                L 116 14 L 130 22 L 138 36 L 145 52
                L 152 70 L 158 92 L 162 116
                L 158 138 L 148 154
                L 140 170 L 134 192 L 128 220 L 116 252
                L 102 286 L 92 308
                L 84 290 L 78 268 L 76 244 L 78 220 L 76 198 L 72 176 L 68 154
                L 64 132 L 60 110 L 58 90 L 60 70
                L 64 52 L 70 36 L 78 24
                Z"
              stroke="var(--jt-olive-700)"
              strokeWidth="1.6"
              strokeLinejoin="round"
              fill="var(--jt-olive-50)"
              initial={{ pathLength: 0, fillOpacity: 0 }}
              whileInView={{ pathLength: 1, fillOpacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 2.2, ease: 'easeInOut' }}
            />

            {/* Inner hairlines: Sea of Galilee, Dead Sea, Jordan River trace.
                Pure decoration — they place the eye geographically. */}
            <motion.ellipse
              cx="138" cy="76" rx="6" ry="9"
              stroke="var(--jt-olive-400)" strokeWidth="0.8" fill="var(--jt-stone-50)"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 0.7 }}
              transition={{ delay: 1.4, duration: 0.6 }}
              viewport={{ once: true }}
            />
            <motion.ellipse
              cx="142" cy="158" rx="7" ry="14"
              stroke="var(--jt-olive-400)" strokeWidth="0.8" fill="var(--jt-stone-50)"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 0.7 }}
              transition={{ delay: 1.6, duration: 0.6 }}
              viewport={{ once: true }}
            />
            <motion.path
              d="M 138 86 L 140 110 L 142 134 L 142 144"
              stroke="var(--jt-olive-400)" strokeWidth="0.7" strokeDasharray="2 2"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              transition={{ delay: 1.5, duration: 0.6 }}
              viewport={{ once: true }}
            />

            {/* West Bank approximate boundary (decorative dashed) */}
            <motion.path
              d="M 116 100 L 124 108 L 132 120 L 138 130 L 138 148 L 130 160 L 122 160 L 114 152 L 108 138 L 110 120 Z"
              stroke="var(--jt-olive-500)" strokeWidth="0.6" strokeDasharray="3 3"
              fill="var(--jt-olive-100)" fillOpacity={0.35}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 1.7, duration: 0.6 }}
              viewport={{ once: true }}
            />

            {/* Gaza Strip approximate boundary (decorative dashed) */}
            <motion.path
              d="M 70 230 L 80 232 L 86 240 L 92 256 L 86 264 L 76 252 L 70 244 Z"
              stroke="var(--jt-olive-500)" strokeWidth="0.6" strokeDasharray="3 3"
              fill="var(--jt-olive-100)" fillOpacity={0.55}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              transition={{ delay: 1.8, duration: 0.6 }}
              viewport={{ once: true }}
            />

            {/* Pulsing dots for key cities — geographically accurate placement.
                Coastal cities sit on the western edge; West Bank cities are
                clustered along the central spine; Gaza dots in the SW corner. */}
            {[
              // Northern coast
              { x: 88, y: 50, label: 'Acre / عكا' },
              { x: 86, y: 64, label: 'Haifa / حيفا' },
              // Galilee + north
              { x: 112, y: 42, label: 'Safad / صفد' },
              { x: 130, y: 70, label: 'Tiberias / طبريا' },
              { x: 110, y: 70, label: 'Nazareth / الناصرة' },
              // Coast (central)
              { x: 80, y: 96, label: 'Caesarea' },
              { x: 76, y: 130, label: 'Jaffa / يافا' },
              { x: 74, y: 142, label: 'Lydda / اللد' },
              // West Bank
              { x: 124, y: 116, label: 'Nablus / نابلس' },
              { x: 124, y: 138, label: 'Jerusalem / القدس' },
              { x: 124, y: 152, label: 'Bethlehem' },
              { x: 130, y: 168, label: 'Hebron / الخليل' },
              // Gaza Strip
              { x: 72, y: 246, label: 'Gaza / غزة' },
              { x: 80, y: 252, label: 'Khan Younis' },
              // Negev / South
              { x: 96, y: 196, label: 'Beer Sheva' },
            ].map((p, i) => (
              <motion.g
                key={p.label}
                initial={{ scale: 0, opacity: 0 }}
                whileInView={{ scale: 1, opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 1.9 + i * 0.06, type: 'spring', stiffness: 220 }}
                style={{ transformOrigin: `${p.x}px ${p.y}px` }}
              >
                <motion.circle
                  cx={p.x}
                  cy={p.y}
                  r="3.5"
                  fill="var(--jt-gold-500)"
                  animate={{ r: [3.5, 6.5, 3.5] }}
                  transition={{ duration: 2.4, delay: i * 0.2, repeat: Infinity, ease: 'easeInOut' }}
                  opacity={0.35}
                />
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="2.2"
                  fill="var(--jt-gold-600)"
                  stroke="var(--jt-stone-50)"
                  strokeWidth="0.6"
                />
                <title>{p.label}</title>
              </motion.g>
            ))}
          </svg>
        </motion.div>
      </section>

      {/* ═══════════════════════ 9 ─ FINAL CTA ══════════════════════ */}
      <section className="relative mx-auto mb-20 max-w-6xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 1, ease: 'easeOut' }}
          className="relative overflow-hidden rounded-[3rem] bg-[var(--jt-olive-900)] px-8 py-20 text-center text-[var(--jt-stone-50)] shadow-[var(--jt-shadow-xl)] md:px-16 md:py-28"
        >
          <div
            aria-hidden
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 30%, var(--jt-olive-600) 0%, transparent 45%), radial-gradient(circle at 85% 75%, var(--jt-gold-500) 0%, transparent 42%)',
            }}
          />
          <div aria-hidden className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")" }} />

          <div className="relative z-10 mx-auto max-w-3xl">
            <p className="mb-5 text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--jt-gold-300)]">
              {t('خطوة واحدة', 'One step')}
            </p>
            <h2
              className="text-[clamp(2.5rem,6vw,5rem)] font-bold leading-[1.05]"
              style={{ fontFamily: 'var(--jt-font-display)' }}
            >
              {t('ابدأ باسمك.', 'Start with your name.')}
              <br />
              <span className="text-[var(--jt-gold-300)]">
                {t('ستنتهي عند جذورك.', 'You\'ll end at your roots.')}
              </span>
            </h2>
            <p className="mx-auto mt-8 max-w-xl text-[var(--jt-stone-200)]" style={{ fontFamily: isAR ? 'var(--jt-font-arabic)' : 'var(--jt-font-latin)', lineHeight: isAR ? 1.95 : 1.6 }}>
              {t(
                'سجّل مجّانًا. أضف فردًا واحدًا. شاهد الشجرة تبدأ بالنمو.',
                'Sign up free. Add one family member. Watch the tree begin to grow.',
              )}
            </p>
            <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/sign-up"
                className="group inline-flex items-center gap-2 rounded-full bg-[var(--jt-gold-400)] px-9 py-4 text-sm font-bold uppercase tracking-[0.15em] text-[var(--jt-olive-900)] shadow-lg transition-all hover:-translate-y-0.5 hover:bg-[var(--jt-gold-300)]"
              >
                {t('سجّل الآن', 'Sign up now')}
                <Arrow className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--jt-stone-50)]/25 px-8 py-4 text-sm font-semibold text-[var(--jt-stone-100)] transition-colors hover:bg-[var(--jt-stone-50)]/10"
              >
                {t('لدي حساب', 'I have an account')}
              </Link>
            </div>

            <div className="mt-14 flex items-center justify-center gap-6 text-[10px] uppercase tracking-[0.3em] text-[var(--jt-stone-300)]">
              <span className="inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--jt-pal-green)]" /> {t('مجّاني', 'Free')}
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--jt-pal-red)]" /> {t('بلا إعلانات', 'Ad-free')}
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--jt-gold-400)] inline-flex items-center justify-center">
                  <MapPin className="h-2.5 w-2.5 text-[var(--jt-olive-900)]" />
                </span>
                {t('عربيّة أوّلًا', 'Arabic-first')}
              </span>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
