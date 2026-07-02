'use client';

import Link from 'next/link';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Heart,
  Info,
  Mail,
  Route,
  Search,
  Sprout,
} from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { CountUp } from '@/components/home/CountUp';
import { DiasporaConstellation } from '@/components/home/DiasporaConstellation';
import { type ReactNode } from 'react';

type Village = {
  id: string;
  name_ar: string;
  name_en: string | null;
  district_ar: string | null;
};

const FALLBACK_VILLAGES: Village[] = [
  { id: '1', name_ar: 'اللد', name_en: 'Lydda', district_ar: 'الرملة' },
  { id: '2', name_ar: 'يافا', name_en: 'Jaffa', district_ar: 'يافا' },
  { id: '3', name_ar: 'حيفا', name_en: 'Haifa', district_ar: 'حيفا' },
  { id: '4', name_ar: 'صفد', name_en: 'Safad', district_ar: 'صفد' },
  { id: '5', name_ar: 'الطنطورة', name_en: 'Al-Tantura', district_ar: 'حيفا' },
  { id: '6', name_ar: 'دير ياسين', name_en: 'Deir Yassin', district_ar: 'القدس' },
  { id: '7', name_ar: 'عكا', name_en: 'Acre', district_ar: 'عكا' },
  { id: '8', name_ar: 'بيسان', name_en: 'Beisan', district_ar: 'بيسان' },
];

const START_CARDS = [
  { icon: Info, titleAr: 'من نحن', titleEn: 'Who we are', subAr: 'رسالتنا والقصة وراء هذه المنصّة', subEn: 'Our mission and the story behind this platform', href: '/about' },
  { icon: Heart, titleAr: 'لماذا نفعل هذا', titleEn: 'Why we do this', subAr: 'الهوية، حقّ العودة، ولماذا هذا مهمّ الآن', subEn: 'Identity, the right of return, and why it matters now', href: '/why' },
  { icon: Route, titleAr: 'كيف يعمل هذا', titleEn: 'How it works', subAr: 'بناء شجرتك، الخصوصية، والشجرة الأم', subEn: 'Building your tree, privacy, and the master tree', href: '/how' },
  { icon: Mail, titleAr: 'تواصل معنا', titleEn: 'Contact us', subAr: 'أسئلة، شراكات، ودعم', subEn: 'Questions, partnerships, and support', href: '/contact' },
];

export function HomeClient({ villages }: { villages: Village[] }) {
  const { t, locale, dir } = useLocale();
  const reduce = useReducedMotion();
  const isAR = locale === 'ar';
  const Arrow = isAR ? ArrowLeft : ArrowRight;
  const names = (villages.length >= 6 ? villages : FALLBACK_VILLAGES).slice(0, 7);

  const heroContainer: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.09, delayChildren: 0.05 } },
  };
  const rise: Variants = reduce
    ? {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { duration: 0.4 } },
      }
    : {
        hidden: { opacity: 0, y: 22, filter: 'blur(6px)' },
        show: {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] },
        },
      };

  return (
    <div dir={dir} className="relative bg-[var(--background)] text-[var(--foreground)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--jt-olive-100)_0%,_transparent_55%)] opacity-60" />
        <div className="absolute inset-x-0 bottom-0 h-[420px] bg-[radial-gradient(ellipse_at_bottom,_var(--jt-gold-100)_0%,_transparent_60%)] opacity-50" />
      </div>

      <div className="mx-auto max-w-4xl px-5 py-10 md:py-14">
        {/* ═══════ HERO ═══════ */}
        <motion.section
          variants={heroContainer}
          initial="hidden"
          animate="show"
          className="relative overflow-hidden rounded-3xl px-7 py-9 shadow-[var(--jt-shadow-xl)] md:px-10 md:py-12"
          style={{
            backgroundImage:
              'linear-gradient(135deg, var(--jt-olive-800) 0%, var(--jt-olive-700) 55%, var(--jt-olive-600) 100%)',
          }}
        >
          {/* layered backdrop: tatreez texture + breathing gold glow */}
          <div aria-hidden className="jt-tatreez-light absolute inset-0 opacity-[0.06]" />
          <div
            aria-hidden
            className="jt-breathe absolute -top-24 h-72 w-72 rounded-full blur-3xl ltr:-right-16 rtl:-left-16"
            style={{ background: 'radial-gradient(circle, var(--jt-gold-400) 0%, transparent 70%)' }}
          />
          <div
            aria-hidden
            className="jt-stripe-flow absolute inset-x-0 top-0 h-1.5"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, var(--jt-terra-500) 0 8px, var(--jt-gold-500) 8px 16px, var(--jt-olive-200) 16px 24px)',
            }}
          />

          <motion.span
            variants={rise}
            className="relative inline-block rounded-full border border-white/10 bg-white/12 px-3 py-1 text-[11px] font-medium text-white/80 backdrop-blur-sm"
          >
            {t('غير ربحيّة · عربيّة أوّلًا · بلا إعلانات', 'Non-profit · Arabic-first · ad-free')}
          </motion.span>

          <motion.h1
            variants={rise}
            className="relative mt-3 max-w-2xl text-[clamp(1.9rem,5vw,3rem)] font-bold leading-[1.15] text-white"
            style={{ fontFamily: isAR ? 'var(--jt-font-display)' : 'var(--jt-font-latin)' }}
          >
            {t('شجرة عائلة واحدة لكلّ فلسطيني، ', 'One family tree for every Palestinian, ')}
            <span className="relative inline-block">
              {t('في كلّ مكان', 'everywhere')}
              <motion.svg
                aria-hidden
                viewBox="0 0 120 10"
                preserveAspectRatio="none"
                className="absolute inset-x-0 -bottom-1.5 h-2.5 w-full"
              >
                <motion.path
                  d="M4 7 Q 60 1 116 6"
                  fill="none"
                  stroke="var(--jt-gold-400)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  initial={{ pathLength: reduce ? 1 : 0, opacity: reduce ? 1 : 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.7, delay: 0.8, ease: 'easeOut' }}
                />
              </motion.svg>
            </span>
          </motion.h1>

          <motion.p variants={rise} className="relative mt-3 text-base text-white/70" dir={isAR ? 'ltr' : 'rtl'}>
            {t('One family tree for every Palestinian, everywhere', 'شجرة عائلة واحدة لكلّ فلسطيني، في كلّ مكان')}
          </motion.p>

          <motion.div variants={rise} className="relative mt-6 flex flex-wrap gap-3">
            <Link
              href="/sign-up"
              className="jt-btn-shine group inline-flex items-center gap-2 rounded-lg bg-[var(--jt-terra-500)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_var(--jt-terra-500)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[var(--jt-terra-600)] hover:shadow-[0_14px_28px_-8px_var(--jt-terra-600)] active:translate-y-0 active:scale-[0.98]"
            >
              <Sprout className="h-4 w-4 transition-transform duration-300 group-hover:-rotate-12" />
              {t('أنشئ شجرة عائلتي', 'Start my family tree')}
              <Arrow className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 rounded-lg border border-white/40 px-5 py-2.5 text-sm font-semibold text-white/90 backdrop-blur-sm transition-all duration-300 hover:border-white/70 hover:bg-white/10"
            >
              <Search className="h-4 w-4" />
              {t('ابحث في الشجرة', 'Search the tree')}
            </Link>
          </motion.div>

          {/* hero stats */}
          <motion.div variants={rise} className="relative mt-7 flex flex-wrap gap-x-10 gap-y-4 border-t border-white/15 pt-5">
            <HeroStat
              value={<CountUp value={15.2} decimals={1} suffix="M" />}
              label={t('فلسطيني في الشتات', 'Palestinians in diaspora')}
            />
            <HeroStat
              value={<CountUp value={530} suffix="+" />}
              label={t('قرية ومدينة موثّقة', 'villages & cities documented')}
            />
            <HeroStat value={t('مجّاني', 'Free')} label={t('للأبد، بلا إعلانات', 'forever, ad-free')} />
          </motion.div>
        </motion.section>

        {/* ═══════ DIASPORA MAP ═══════ */}
        <motion.section
          variants={rise}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-40px' }}
          className="mt-4 rounded-2xl border border-[var(--jt-stone-200)] bg-[var(--card)] p-4 shadow-[var(--jt-shadow-sm)] md:p-5"
        >
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="relative h-28 w-full flex-1 overflow-hidden rounded-xl bg-gradient-to-br from-[var(--jt-stone-100)] via-[var(--jt-stone-50)] to-[var(--jt-olive-50)] sm:h-32">
              <DiasporaConstellation className="h-full w-full" />
            </div>
            <div className="flex-1 text-sm text-[var(--jt-stone-600)]" style={{ lineHeight: 1.65 }}>
              <span className="font-semibold text-[var(--jt-olive-900)]">{t('من حيفا إلى سانتياغو.', 'From Haifa to Santiago.')}</span>{' '}
              {t(
                'كلّ نقطة عائلة موثّقة. العائلات من القرية نفسها تتناثر في عشرات الدول — وهنا يصبح هذا التشتّت مرئيًّا في مكان واحد لأول مرّة.',
                'Every dot is a documented family. Families from one village scatter across dozens of countries — here that scatter becomes visible in one place for the first time.',
              )}
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-[var(--jt-stone-200)]/60 pt-3 text-[11px] text-[var(--jt-stone-500)]">
            <span className="font-semibold uppercase tracking-[0.15em]">{t('قرى نحفظها:', 'Villages we remember:')}</span>
            {names.map((v, i) => (
              <motion.span
                key={v.id}
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.7 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: i * 0.06 }}
                className="rounded-full bg-[var(--jt-olive-50)] px-2 py-0.5 font-medium text-[var(--jt-olive-700)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[var(--jt-olive-100)] hover:shadow-[var(--jt-shadow-sm)]"
                style={{ fontFamily: 'var(--jt-font-display)' }}
              >
                {v.name_ar}
              </motion.span>
            ))}
          </div>
        </motion.section>

        {/* ═══════ WHERE TO START ═══════ */}
        <div className="mb-3 mt-8 flex items-baseline gap-2">
          <span aria-hidden className="h-2 w-2 rounded-full bg-[var(--jt-gold-400)]" />
          <h2 className="text-lg font-bold text-[var(--jt-olive-900)]" style={{ fontFamily: 'var(--jt-font-display)' }}>
            {t('من أين تريد أن تبدأ؟', 'Where would you like to start?')}
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {START_CARDS.map((c, i) => {
            const Icon = c.icon;
            const isMail = c.href.startsWith('mailto:');
            const cls =
              'group relative block overflow-hidden rounded-2xl border border-[var(--jt-stone-200)] bg-[var(--card)] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--jt-olive-400)] hover:shadow-[var(--jt-shadow-md)]';
            const inner = (
              <motion.div
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ type: 'spring', stiffness: 200, damping: 22, delay: (i % 2) * 0.08 }}
              >
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-0.5 origin-center scale-x-0 bg-gradient-to-r from-[var(--jt-olive-400)] via-[var(--jt-gold-400)] to-[var(--jt-terra-400)] transition-transform duration-500 group-hover:scale-x-100"
                />
                <span
                  aria-hidden
                  className="absolute top-4 opacity-0 transition-all duration-300 ltr:right-4 ltr:-translate-x-1 rtl:left-4 rtl:translate-x-1 group-hover:translate-x-0 group-hover:opacity-100"
                >
                  <Arrow className="h-4 w-4 text-[var(--jt-olive-500)]" />
                </span>
                <span className="mb-2.5 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--jt-olive-50)] text-[var(--jt-olive-600)] transition-all duration-300 group-hover:rotate-3 group-hover:scale-110 group-hover:bg-[var(--jt-olive-600)] group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="text-[15px] font-semibold text-[var(--jt-olive-900)]">{t(c.titleAr, c.titleEn)}</h3>
                <p className="mt-1 text-[12px] leading-snug text-[var(--jt-stone-500)]">{t(c.subAr, c.subEn)}</p>
              </motion.div>
            );
            return isMail ? (
              <a key={c.titleEn} href={c.href} className={cls}>{inner}</a>
            ) : (
              <Link key={c.titleEn} href={c.href} className={cls}>{inner}</Link>
            );
          })}
        </div>

        {/* ═══════ FOOTER CTA ═══════ */}
        <motion.section
          variants={rise}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-40px' }}
          className="relative mt-8 overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--jt-terra-50)] via-[var(--jt-gold-50)] to-[var(--jt-olive-50)] px-6 py-8 text-center shadow-[var(--jt-shadow-sm)]"
        >
          <div aria-hidden className="jt-tatreez-dark absolute inset-0 opacity-[0.05]" />
          <span className="jt-float relative inline-flex h-11 w-11 items-center justify-center rounded-full bg-[var(--jt-olive-600)] text-white shadow-[var(--jt-shadow-md)]">
            <Sprout className="h-5 w-5" />
          </span>
          <p className="relative mt-3 text-[15px] text-[var(--jt-stone-800)]">
            {t('قصّة عائلتك تنتمي إلى هنا. يستغرق البدء حوالي عشر دقائق.', "Your family's story belongs here. It takes about ten minutes to begin.")}
          </p>
          <Link
            href="/sign-up"
            className="jt-btn-shine relative mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--jt-terra-500)] px-6 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_-10px_var(--jt-terra-500)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[var(--jt-terra-600)] hover:shadow-[0_14px_28px_-8px_var(--jt-terra-600)] active:translate-y-0"
          >
            {t('أنشئ شجرة عائلتك', 'Create your family tree')}
            <Arrow className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </motion.section>
      </div>
    </div>
  );
}

function HeroStat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div>
      <p className="text-xl font-bold text-white" style={{ fontFamily: 'var(--jt-font-display)' }}>
        {value}
      </p>
      <p className="text-[11px] text-white/65">{label}</p>
    </div>
  );
}
