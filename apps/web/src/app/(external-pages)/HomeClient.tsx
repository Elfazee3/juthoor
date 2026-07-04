'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
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
import { ScrollWords } from '@/components/about/ScrollWords';
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

/** Fixed scatter for the hero's floating golden "root node" particles (percent). */
const PARTICLES: Array<[number, number, number]> = [
  // [x%, y%, durationSeconds]
  [8, 22, 7], [16, 72, 9], [25, 38, 6], [37, 82, 8], [46, 16, 7.5],
  [57, 62, 6.5], [67, 30, 9], [77, 76, 7], [87, 44, 8.5], [93, 14, 6],
];

export function HomeClient({ villages }: { villages: Village[] }) {
  const { t, locale, dir } = useLocale();
  const reduce = useReducedMotion();
  const isAR = locale === 'ar';
  const Arrow = isAR ? ArrowLeft : ArrowRight;
  const names = (villages.length >= 6 ? villages : FALLBACK_VILLAGES).slice(0, 7);

  const heroContainer: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: reduce ? 0 : 0.1, delayChildren: 0.05 } },
  };
  const rise: Variants = reduce
    ? {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { duration: 0.4 } },
      }
    : {
        hidden: { opacity: 0, y: 26, filter: 'blur(6px)' },
        show: {
          opacity: 1,
          y: 0,
          filter: 'blur(0px)',
          transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] },
        },
      };

  return (
    <div dir={dir} className="relative bg-[var(--background)] text-[var(--foreground)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--jt-olive-100)_0%,_transparent_55%)] opacity-60" />
        <div className="absolute inset-x-0 bottom-0 h-[420px] bg-[radial-gradient(ellipse_at_bottom,_var(--jt-gold-100)_0%,_transparent_60%)] opacity-50" />
        <div className="absolute top-1/2 h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle,_var(--jt-terra-100)_0%,_transparent_70%)] opacity-40 blur-2xl ltr:-left-24 rtl:-right-24" />
      </div>

      {/* ═══════ HERO — full-bleed ═══════ */}
      <motion.section
        variants={heroContainer}
        initial="hidden"
        animate="show"
        className="relative flex min-h-[calc(100svh-4rem)] flex-col overflow-hidden"
        style={{
          backgroundImage:
            'linear-gradient(150deg, var(--jt-olive-900) 0%, var(--jt-olive-800) 40%, var(--jt-olive-700) 75%, var(--jt-olive-600) 100%)',
        }}
      >
        {/* layered backdrop: tatreez texture + breathing glows + flag stripe */}
        <div aria-hidden className="jt-tatreez-light absolute inset-0 opacity-[0.05]" />
        <div
          aria-hidden
          className="jt-breathe absolute -top-32 h-[480px] w-[480px] rounded-full blur-3xl ltr:-right-24 rtl:-left-24"
          style={{ background: 'radial-gradient(circle, var(--jt-gold-400) 0%, transparent 70%)' }}
        />
        <div
          aria-hidden
          className="absolute -bottom-40 h-[420px] w-[420px] rounded-full opacity-25 blur-3xl ltr:-left-24 rtl:-right-24"
          style={{ background: 'radial-gradient(circle, var(--jt-terra-400) 0%, transparent 70%)' }}
        />
        <div
          aria-hidden
          className="jt-stripe-flow absolute inset-x-0 top-0 h-1.5"
          style={{
            backgroundImage:
              'repeating-linear-gradient(45deg, var(--jt-terra-500) 0 8px, var(--jt-gold-500) 8px 16px, var(--jt-olive-200) 16px 24px)',
          }}
        />

        {/* floating golden root-node particles */}
        {!reduce &&
          PARTICLES.map(([x, y, dur], i) => (
            <motion.span
              key={i}
              aria-hidden
              className="absolute h-1.5 w-1.5 rounded-full bg-[var(--jt-gold-300)]"
              style={{ left: `${x}%`, top: `${y}%`, boxShadow: '0 0 8px 2px rgba(232,189,71,0.35)' }}
              animate={{ y: [0, -22, 0], opacity: [0.15, 0.75, 0.15] }}
              transition={{ duration: dur, delay: i * 0.6, repeat: Infinity, ease: 'easeInOut' }}
            />
          ))}

        <div className="relative mx-auto flex w-full max-w-6xl flex-1 items-center px-6 py-14 md:px-10">
          <div className="w-full items-center gap-12 md:flex">
            {/* ── text column ── */}
            <div className="min-w-0 flex-1">
              <motion.span
                variants={rise}
                className="inline-block rounded-full border border-white/10 bg-white/12 px-4 py-1.5 text-xs font-medium tracking-wide text-white/85 backdrop-blur-sm"
              >
                {t('غير ربحيّة · عربيّة أوّلًا · بلا إعلانات', 'Non-profit · Arabic-first · ad-free')}
              </motion.span>

              <motion.h1
                variants={rise}
                className="mt-5 max-w-3xl text-[clamp(2.4rem,6.5vw,4.4rem)] font-bold leading-[1.12] text-white"
                style={{ fontFamily: isAR ? 'var(--jt-font-display)' : 'var(--jt-font-latin)' }}
              >
                {t('شجرة عائلة واحدة لكلّ فلسطيني، ', 'One family tree for every Palestinian, ')}
                <span className="relative inline-block text-[var(--jt-gold-200)]">
                  {t('في كلّ مكان', 'everywhere')}
                  <motion.svg
                    aria-hidden
                    viewBox="0 0 120 10"
                    preserveAspectRatio="none"
                    className="absolute inset-x-0 -bottom-2 h-3 w-full"
                  >
                    <motion.path
                      d="M4 7 Q 60 1 116 6"
                      fill="none"
                      stroke="var(--jt-gold-400)"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      initial={{ pathLength: reduce ? 1 : 0, opacity: reduce ? 1 : 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.7, delay: 1, ease: 'easeOut' }}
                    />
                  </motion.svg>
                </span>
              </motion.h1>

              <motion.p
                variants={rise}
                className="mt-4 max-w-xl text-base text-white/65 md:text-lg"
                dir={isAR ? 'ltr' : 'rtl'}
              >
                {t('One family tree for every Palestinian, everywhere', 'شجرة عائلة واحدة لكلّ فلسطيني، في كلّ مكان')}
              </motion.p>

              <motion.div variants={rise} className="mt-8 flex flex-wrap gap-3.5">
                <Link
                  href="/sign-up"
                  className="jt-btn-shine group inline-flex items-center gap-2.5 rounded-xl bg-[var(--jt-terra-500)] px-7 py-3.5 text-[15px] font-semibold text-white shadow-[0_14px_32px_-10px_var(--jt-terra-500)] transition-all duration-300 hover:-translate-y-1 hover:bg-[var(--jt-terra-600)] hover:shadow-[0_20px_40px_-10px_var(--jt-terra-600)] active:translate-y-0 active:scale-[0.98]"
                >
                  <Sprout className="h-5 w-5 transition-transform duration-300 group-hover:-rotate-12" />
                  {t('أنشئ شجرة عائلتي', 'Start my family tree')}
                  <Arrow className="h-5 w-5 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
                </Link>
                <Link
                  href="/sign-up"
                  className="inline-flex items-center gap-2.5 rounded-xl border border-white/35 px-7 py-3.5 text-[15px] font-semibold text-white/90 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-white/70 hover:bg-white/10"
                >
                  <Search className="h-5 w-5" />
                  {t('ابحث في الشجرة', 'Search the tree')}
                </Link>
              </motion.div>

              {/* hero artwork on small screens */}
              <motion.div variants={rise} className="relative mx-auto mt-10 w-52 md:hidden">
                <div
                  aria-hidden
                  className="absolute -inset-4 rounded-[2rem] opacity-40 blur-2xl"
                  style={{ background: 'radial-gradient(circle, var(--jt-gold-400) 0%, transparent 70%)' }}
                />
                <div className="jt-float relative overflow-hidden rounded-3xl shadow-[var(--jt-shadow-xl)] ring-1 ring-white/25">
                  <Image
                    src="/images/home/olive-tree.png"
                    alt={t('شجرة زيتون تمتدّ جذورها لتشكّل شبكة عائلة متّصلة', 'An olive tree whose roots form a connected family network')}
                    width={1024}
                    height={1024}
                    sizes="208px"
                    priority
                    className="h-auto w-full"
                  />
                </div>
              </motion.div>

              {/* hero stats */}
              <motion.div
                variants={rise}
                className="mt-10 flex flex-wrap gap-x-12 gap-y-5 border-t border-white/15 pt-6"
              >
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
            </div>

            {/* ── artwork column (md+) ── */}
            <motion.div variants={rise} className="relative hidden flex-none md:block md:w-[320px] lg:w-[400px]">
              <div
                aria-hidden
                className="absolute -inset-8 rounded-[3rem] opacity-45 blur-3xl"
                style={{ background: 'radial-gradient(circle, var(--jt-gold-400) 0%, transparent 70%)' }}
              />
              <div className="jt-float relative overflow-hidden rounded-[2rem] shadow-[var(--jt-shadow-xl)] ring-1 ring-white/25">
                <Image
                  src="/images/home/olive-tree.png"
                  alt={t('شجرة زيتون تمتدّ جذورها لتشكّل شبكة عائلة متّصلة', 'An olive tree whose roots form a connected family network')}
                  width={1024}
                  height={1024}
                  sizes="400px"
                  priority
                  className="h-auto w-full"
                />
              </div>
            </motion.div>
          </div>
        </div>

        {/* scroll cue */}
        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 0.8 }}
          className="relative mx-auto mb-5 flex flex-col items-center gap-1 text-white/50"
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.3em]">
            {t('اكتشف', 'Discover')}
          </span>
          <motion.span
            animate={reduce ? undefined : { y: [0, 7, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          >
            <ChevronDown className="h-5 w-5" />
          </motion.span>
        </motion.div>
      </motion.section>

      <div className="mx-auto max-w-5xl px-5 py-12 md:py-16">
        {/* ═══════ DIASPORA MAP ═══════ */}
        <motion.section
          variants={rise}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-40px' }}
          className="rounded-3xl border border-[var(--jt-stone-200)] bg-[var(--card)] p-5 shadow-[var(--jt-shadow-sm)] md:p-6"
        >
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <div className="relative h-36 w-full flex-1 overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--jt-stone-100)] via-[var(--jt-stone-50)] to-[var(--jt-olive-50)] sm:h-44">
              <DiasporaConstellation className="h-full w-full" />
            </div>
            <div className="flex-1 text-[15px] text-[var(--jt-stone-600)]" style={{ lineHeight: 1.7 }}>
              <span className="mb-1.5 block text-lg font-semibold text-[var(--jt-olive-900)]" style={{ fontFamily: 'var(--jt-font-display)' }}>
                {t('من حيفا إلى سانتياغو.', 'From Haifa to Santiago.')}
              </span>
              <ScrollWords
                text={t(
                  'كلّ نقطة عائلة موثّقة. العائلات من القرية نفسها تتناثر في عشرات الدول — وهنا يصبح هذا التشتّت مرئيًّا في مكان واحد لأول مرّة.',
                  'Every dot is a documented family. Families from one village scatter across dozens of countries — here that scatter becomes visible in one place for the first time.',
                )}
              />
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1.5 border-t border-[var(--jt-stone-200)]/60 pt-4 text-xs text-[var(--jt-stone-500)]">
            <span className="font-semibold uppercase tracking-[0.15em]">{t('قرى نحفظها:', 'Villages we remember:')}</span>
            {names.map((v, i) => (
              <motion.span
                key={v.id}
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.7 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ type: 'spring', stiffness: 300, damping: 20, delay: i * 0.06 }}
                className="rounded-full bg-[var(--jt-olive-50)] px-2.5 py-1 font-medium text-[var(--jt-olive-700)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[var(--jt-olive-100)] hover:shadow-[var(--jt-shadow-sm)]"
                style={{ fontFamily: 'var(--jt-font-display)' }}
              >
                {v.name_ar}
              </motion.span>
            ))}
          </div>
        </motion.section>

        {/* ═══════ WHERE TO START ═══════ */}
        <div className="mb-4 mt-12 flex items-baseline gap-2.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-[var(--jt-gold-400)]" />
          <h2 className="text-2xl font-bold text-[var(--jt-olive-900)]" style={{ fontFamily: 'var(--jt-font-display)' }}>
            {t('من أين تريد أن تبدأ؟', 'Where would you like to start?')}
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {START_CARDS.map((c, i) => {
            const Icon = c.icon;
            const isMail = c.href.startsWith('mailto:');
            const cls =
              'group relative block overflow-hidden rounded-2xl border border-[var(--jt-stone-200)] bg-[var(--card)] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--jt-olive-400)] hover:shadow-[var(--jt-shadow-md)]';
            const inner = (
              <motion.div
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ type: 'spring', stiffness: 200, damping: 22, delay: (i % 4) * 0.07 }}
              >
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-0.5 origin-center scale-x-0 bg-gradient-to-r from-[var(--jt-olive-400)] via-[var(--jt-gold-400)] to-[var(--jt-terra-400)] transition-transform duration-500 group-hover:scale-x-100"
                />
                <span
                  aria-hidden
                  className="absolute top-5 opacity-0 transition-all duration-300 ltr:right-5 ltr:-translate-x-1 rtl:left-5 rtl:translate-x-1 group-hover:translate-x-0 group-hover:opacity-100"
                >
                  <Arrow className="h-4 w-4 text-[var(--jt-olive-500)]" />
                </span>
                <span className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--jt-olive-50)] text-[var(--jt-olive-600)] transition-all duration-300 group-hover:rotate-3 group-hover:scale-110 group-hover:bg-[var(--jt-olive-600)] group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="text-base font-semibold text-[var(--jt-olive-900)]">{t(c.titleAr, c.titleEn)}</h3>
                <p className="mt-1.5 text-[13px] leading-snug text-[var(--jt-stone-500)]">{t(c.subAr, c.subEn)}</p>
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
          className="relative mt-12 overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--jt-terra-50)] via-[var(--jt-gold-50)] to-[var(--jt-olive-50)] text-center shadow-[var(--jt-shadow-sm)]"
        >
          <div aria-hidden className="jt-tatreez-dark absolute inset-0 opacity-[0.05]" />
          <div className="relative px-6 pt-10 pb-2">
            <span className="jt-float relative inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--jt-olive-600)] text-white shadow-[var(--jt-shadow-md)]">
              <Sprout className="h-5 w-5" />
            </span>
            <p className="relative mx-auto mt-4 max-w-md text-lg text-[var(--jt-stone-800)]" style={{ fontFamily: 'var(--jt-font-display)' }}>
              {t('قصّة عائلتك تنتمي إلى هنا. يستغرق البدء حوالي عشر دقائق.', "Your family's story belongs here. It takes about ten minutes to begin.")}
            </p>
            <Link
              href="/sign-up"
              className="jt-btn-shine relative mt-5 inline-flex items-center gap-2.5 rounded-xl bg-[var(--jt-terra-500)] px-8 py-3.5 text-[15px] font-semibold text-white shadow-[0_14px_32px_-10px_var(--jt-terra-500)] transition-all duration-300 hover:-translate-y-1 hover:bg-[var(--jt-terra-600)] hover:shadow-[0_20px_40px_-10px_var(--jt-terra-600)] active:translate-y-0"
            >
              {t('أنشئ شجرة عائلتك', 'Create your family tree')}
              <Arrow className="h-5 w-5" />
            </Link>
          </div>
          {/* village horizon — generated artwork */}
          <div className="relative mt-5 h-32 w-full sm:h-44">
            <Image
              src="/images/home/village-panorama.png"
              alt=""
              fill
              sizes="(max-width: 1064px) 100vw, 1024px"
              className="object-cover"
              style={{ objectPosition: 'center 72%' }}
            />
            <div
              aria-hidden
              className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-[var(--jt-gold-50)] to-transparent"
            />
          </div>
        </motion.section>
      </div>
    </div>
  );
}

function HeroStat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div>
      <p className="text-2xl font-bold text-white md:text-3xl" style={{ fontFamily: 'var(--jt-font-display)' }}>
        {value}
      </p>
      <p className="mt-0.5 text-xs text-white/65">{label}</p>
    </div>
  );
}
