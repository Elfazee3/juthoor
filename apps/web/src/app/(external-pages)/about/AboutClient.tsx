'use client';

import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Feather,
  Globe2,
  Heart,
  Lock,
  ScrollText,
  Sparkles,
  Users,
} from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { ScrollProgress } from '@/components/ScrollProgress';

const PRINCIPLES = [
  {
    icon: Heart,
    titleAr: 'غير ربحيّة',
    titleEn: 'Non-profit',
    descAr: 'لا مساهمين. لا إعلانات. بياناتك ليست منتجًا.',
    descEn: 'No shareholders. No ads. Your data is not a product.',
  },
  {
    icon: Globe2,
    titleAr: 'عربيّة أوّلًا',
    titleEn: 'Arabic-first',
    descAr: 'بُنيت من اليمين لليسار. كلّ اسم يُحفظ بعربيّته أوّلًا.',
    descEn: 'Built right-to-left. Every name preserved in Arabic first.',
  },
  {
    icon: Lock,
    titleAr: 'خصوصيّة بالتصميم',
    titleEn: 'Private by design',
    descAr: 'شجرتك تخصّك. لا تُفهرس، لا تُباع، لا تُشارك بدون إذنك.',
    descEn: 'Your tree is yours. Not indexed, not sold, not shared without consent.',
  },
  {
    icon: ScrollText,
    titleAr: 'مفتوحة المصدر',
    titleEn: 'Open source',
    descAr: 'الكود شفّاف. أيّ شخص يمكنه أن يتحقّق كيف تُعامَل بياناته.',
    descEn: 'The code is transparent. Anyone can verify how their data is handled.',
  },
  {
    icon: Users,
    titleAr: 'جماعيّة',
    titleEn: 'Community-owned',
    descAr: 'تتطوّر بيد عائلات فلسطين نفسها، لا بيد منصّة ربحيّة.',
    descEn: 'Evolving in the hands of Palestinian families — not a for-profit platform.',
  },
  {
    icon: Feather,
    titleAr: 'رقيقة',
    titleEn: 'Gentle',
    descAr: 'الذاكرة ثقيلة. الواجهة خفيفة. كلّ حقل اختياري، كلّ اسم مقدّس.',
    descEn: 'Memory is heavy. The UI is light. Every field optional, every name sacred.',
  },
];

const STORY_PARAGRAPHS = [
  {
    ar: 'بدأ كلّ شيء بسؤال بسيط: كيف أخبر ابني من هي جدّته الكبرى، ومن أيّ قرية أتت، ولماذا لم نعد نعيش هناك؟',
    en: 'It all started with a simple question: how do I tell my son who his great-grandmother was, which village she came from, and why we no longer live there?',
  },
  {
    ar: 'ثمّ أدركنا أنّنا لسنا وحدنا. ١٥٫٢ مليون فلسطيني حول العالم، يحملون الأسماء نفسها، القرى نفسها، الصمت نفسه.',
    en: 'Then we realized we were not alone. 15.2 million Palestinians around the world, carrying the same names, the same villages, the same silence.',
  },
  {
    ar: 'المنصّات الموجودة؟ أمريكيّة. بيضاء. مدفوعة الثمن. لا تعرف كيف تكتب «دير ياسين».',
    en: 'The existing platforms? American. Paid. They don\'t know how to spell "Deir Yassin."',
  },
  {
    ar: 'فبنينا هذه. ليست منتجًا. هديّة.',
    en: 'So we built this. Not a product. A gift.',
  },
];

export function AboutClient() {
  const { t, locale, dir } = useLocale();
  const isAR = locale === 'ar';
  const Arrow = isAR ? ArrowLeft : ArrowRight;

  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroY = useTransform(scrollYProgress, [0, 1], ['0%', '25%']);
  const heroOpacity = useTransform(scrollYProgress, [0, 1], [1, 0.25]);

  return (
    <div dir={dir} className="relative bg-[var(--background)] text-[var(--foreground)]">
      <ScrollProgress />

      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--jt-olive-100)_0%,_transparent_55%)] opacity-60" />
        <div className="absolute inset-x-0 bottom-0 h-[520px] bg-[radial-gradient(ellipse_at_bottom,_var(--jt-gold-100)_0%,_transparent_60%)] opacity-50" />
        <div
          className="absolute inset-0 opacity-[0.06] mix-blend-multiply"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.6'/></svg>\")",
          }}
        />
      </div>

      {/* ═══════ 1 ─ HERO ═══════ */}
      <section ref={heroRef} className="relative flex min-h-[78vh] items-center justify-center px-6 pt-28 pb-20">
        <motion.div style={{ y: heroY, opacity: heroOpacity }} className="flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-[var(--jt-olive-200)]/70 bg-[var(--jt-olive-50)]/80 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--jt-olive-700)] shadow-[var(--jt-shadow-sm)] backdrop-blur"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {t('قصّة جذور', 'The story of Juthoor')}
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.4, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-[clamp(3rem,9vw,7rem)] font-bold leading-[0.95] tracking-tight text-[var(--jt-olive-900)]"
            style={{ fontFamily: 'var(--jt-font-display)' }}
          >
            {t('لماذا جذور؟', 'Why Juthoor?')}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, delay: 0.8 }}
            className="mt-8 max-w-2xl text-[clamp(1.15rem,2vw,1.5rem)] text-[var(--jt-stone-700)]"
            style={{ fontFamily: 'var(--jt-font-display)', lineHeight: 1.6 }}
          >
            {t(
              'ليس تطبيقًا. ليس منتجًا. مشروعٌ شعبيّ لحفظ الأسماء والقرى قبل أن يأخذها النسيان.',
              'Not an app. Not a product. A grassroots mission to keep our names and villages before forgetting takes them.',
            )}
          </motion.p>
        </motion.div>
      </section>

      {/* ═══════ 2 ─ ORIGIN STORY ═══════ */}
      <section className="relative mx-auto max-w-3xl px-6 py-28 text-center">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-10 text-[11px] font-semibold uppercase tracking-[0.35em] text-[var(--jt-olive-700)]"
        >
          {t('كيف بدأنا', 'How it started')}
        </motion.p>
        <div className="flex flex-col gap-10">
          {STORY_PARAGRAPHS.map((p, i) => (
            <motion.p
              key={p.en}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 1, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-[clamp(1.25rem,2.6vw,1.9rem)] font-normal leading-[1.6] text-[var(--jt-olive-900)]"
              style={{ fontFamily: 'var(--jt-font-display)' }}
            >
              {t(p.ar, p.en)}
            </motion.p>
          ))}
        </div>
      </section>

      {/* ═══════ 3 ─ PRINCIPLES ═══════ */}
      <section className="relative border-y border-[var(--jt-olive-200)]/40 bg-[var(--jt-stone-50)]/60 py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-16 text-center">
            <motion.p
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="mb-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--jt-olive-700)]"
            >
              {t('مبادئنا', 'Our principles')}
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9 }}
              className="text-3xl font-bold text-[var(--jt-olive-900)] md:text-5xl"
              style={{ fontFamily: 'var(--jt-font-display)' }}
            >
              {t('ستّة التزامات. لا تفاوض عليها.', 'Six commitments. Non-negotiable.')}
            </motion.h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {PRINCIPLES.map((p, i) => {
              const Icon = p.icon;
              return (
                <motion.div
                  key={p.titleEn}
                  initial={{ opacity: 0, y: 22 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.6, delay: (i % 3) * 0.08 }}
                  className="group relative overflow-hidden rounded-3xl border border-[var(--jt-stone-200)] bg-[var(--card)] p-7 shadow-[var(--jt-shadow-sm)] transition-all hover:-translate-y-1 hover:border-[var(--jt-olive-300)] hover:shadow-[var(--jt-shadow-md)]"
                >
                  <div aria-hidden className="absolute -end-10 -top-10 h-28 w-28 rounded-full bg-[var(--jt-olive-50)] opacity-60 transition-transform group-hover:scale-125" />
                  <div className="relative">
                    <span className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--jt-olive-700)] text-[var(--jt-stone-50)]">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3
                      className="mb-2 text-2xl font-bold text-[var(--jt-olive-900)]"
                      style={{ fontFamily: 'var(--jt-font-display)' }}
                    >
                      {t(p.titleAr, p.titleEn)}
                    </h3>
                    <p
                      className="text-[var(--jt-stone-700)]"
                      style={{ fontFamily: isAR ? 'var(--jt-font-arabic)' : 'var(--jt-font-latin)', lineHeight: isAR ? 1.9 : 1.6 }}
                    >
                      {t(p.descAr, p.descEn)}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════ 4 ─ WHAT WE REFUSE ═══════ */}
      <section className="relative mx-auto max-w-4xl px-6 py-28 text-center">
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mb-5 text-[11px] font-semibold uppercase tracking-[0.3em] text-[var(--jt-terra-600)]"
        >
          {t('ما نرفضه', 'What we refuse')}
        </motion.p>
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9 }}
          className="mb-10 text-3xl font-bold text-[var(--jt-olive-900)] md:text-5xl"
          style={{ fontFamily: 'var(--jt-font-display)' }}
        >
          {t('نحن لسنا Ancestry.com', 'We are not Ancestry.com')}
        </motion.h2>
        <div className="mx-auto grid max-w-3xl gap-3 text-start rtl:text-right md:grid-cols-2">
          {[
            { ar: 'لن نبيع بياناتك DNA', en: 'We will not sell your DNA data' },
            { ar: 'لن نحتكر شجرتك', en: 'We will not lock your tree behind a paywall' },
            { ar: 'لن نحوّل الذاكرة إلى اشتراك', en: 'We will not turn memory into a subscription' },
            { ar: 'لن نطلب منك أن تُلحق قسمًا لغويًا لاسم ستّك', en: 'We will not force an English transliteration on your grandmother\'s name' },
          ].map((line, i) => (
            <motion.div
              key={line.en}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.6, delay: i * 0.08 }}
              className="flex items-start gap-3 rounded-2xl border border-[var(--jt-terra-200)]/50 bg-[var(--jt-terra-50)]/40 p-4"
            >
              <span className="mt-1 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--jt-terra-500)] text-[10px] font-bold text-white">
                ✕
              </span>
              <span className="text-sm text-[var(--jt-stone-800)]" style={{ fontFamily: isAR ? 'var(--jt-font-arabic)' : 'var(--jt-font-latin)', lineHeight: isAR ? 1.9 : 1.6 }}>
                {t(line.ar, line.en)}
              </span>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ═══════ 5 ─ STATS ═══════ */}
      <section className="relative mx-auto max-w-4xl px-6 py-24 text-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 1 }}
          className="grid grid-cols-2 gap-8 rounded-[2.5rem] border border-[var(--jt-olive-200)]/60 bg-[var(--card)] p-10 shadow-[var(--jt-shadow-md)] md:grid-cols-4 md:p-14"
        >
          {[
            { v: '٢٦٣', vEn: '263', ar: 'قرية موثّقة', en: 'villages documented' },
            { v: '١٤', vEn: '14', ar: 'منطقة فلسطينيّة', en: 'Palestinian districts' },
            { v: '٠', vEn: '$0', ar: 'ثمن الاستخدام', en: 'price to use' },
            { v: '∞', vEn: '∞', ar: 'قصص لنحفظها', en: 'stories to preserve' },
          ].map((s, i) => (
            <motion.div
              key={s.en}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.08, type: 'spring', stiffness: 120 }}
              className="flex flex-col items-center gap-2"
            >
              <span
                className="text-[clamp(2.5rem,6vw,4rem)] font-bold text-[var(--jt-olive-800)]"
                style={{ fontFamily: 'var(--jt-font-display)' }}
              >
                {isAR ? s.v : s.vEn}
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--jt-stone-600)]">
                {t(s.ar, s.en)}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ═══════ 6 ─ CLOSING CTA ═══════ */}
      <section className="relative mx-auto mb-20 max-w-5xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 1 }}
          className="relative overflow-hidden rounded-[3rem] bg-[var(--jt-olive-900)] px-8 py-20 text-center text-[var(--jt-stone-50)] shadow-[var(--jt-shadow-xl)] md:px-16 md:py-24"
        >
          <div
            aria-hidden
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 30%, var(--jt-olive-600) 0%, transparent 45%), radial-gradient(circle at 85% 75%, var(--jt-gold-500) 0%, transparent 42%)',
            }}
          />
          <div className="relative z-10 mx-auto max-w-2xl">
            <h2 className="text-[clamp(2rem,5vw,3.5rem)] font-bold leading-tight" style={{ fontFamily: 'var(--jt-font-display)' }}>
              {t('الذاكرة لا تعيش في الأرشيف.', 'Memory does not live in archives.')}
              <br />
              <span className="text-[var(--jt-gold-300)]">{t('تعيش في العائلة.', 'It lives in families.')}</span>
            </h2>
            <p className="mx-auto mt-8 max-w-xl text-[var(--jt-stone-200)]" style={{ fontFamily: isAR ? 'var(--jt-font-arabic)' : 'var(--jt-font-latin)', lineHeight: isAR ? 1.95 : 1.6 }}>
              {t(
                'أضِف اسمًا واحدًا. ابدأ شجرتك. كن جزءًا من الأرشيف الحيّ.',
                'Add one name. Start your tree. Become part of the living archive.',
              )}
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/sign-up"
                className="group inline-flex items-center gap-2 rounded-full bg-[var(--jt-gold-400)] px-8 py-4 text-sm font-bold uppercase tracking-[0.15em] text-[var(--jt-olive-900)] shadow-lg transition-all hover:-translate-y-0.5 hover:bg-[var(--jt-gold-300)]"
              >
                {t('انضمّ مجّانًا', 'Join — free')}
                <Arrow className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--jt-stone-50)]/25 px-8 py-4 text-sm font-semibold text-[var(--jt-stone-100)] transition-colors hover:bg-[var(--jt-stone-50)]/10"
              >
                {t('ارجع إلى الرئيسية', 'Back to home')}
              </Link>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  );
}
