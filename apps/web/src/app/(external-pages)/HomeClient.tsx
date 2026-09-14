'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Heart,
  Info,
  Mail,
  Route as RouteIcon,
  Sprout,
} from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { CountUp } from '@/components/home/CountUp';
import { DiasporaConstellation } from '@/components/home/DiasporaConstellation';
import { ScrollWords } from '@/components/about/ScrollWords';

/**
 * Homepage, structured after the platform's own hand-drawn Home Page
 * wireframe ("1 E Home Page.pdf") and FRS Appendix 2 ("Front-End GUI
 * Design", Module 2.0 — Home Page). The module nav (Trees / Individuals /
 * Families / VCC / Picture Archive / Document Archive) and Log In/Register
 * live in the shared Navbar (see apps/web/src/app/Navbar.tsx) — this
 * component owns everything below it:
 *
 *  Sidebar: Who We Are | Why Are We Doing This | How Does This Work | Contact Us
 *  Body:    Who We Are -> Why Are We Doing This -> How Does This Work -> Contact Us,
 *           drawn in the wireframe as one connected vertical flow, not a card grid.
 *  Also carries the diaspora map, real villages marquee, and footer CTA +
 *  village-panorama artwork from the previous homepage design, so nothing
 *  was lost in the redesign.
 */

type Accent = 'olive' | 'gold' | 'terra';
const ACCENTS: Accent[] = ['olive', 'gold', 'terra', 'olive'];
const ACCENT_BG: Record<Accent, string> = {
  olive: 'bg-[var(--jt-olive-600)]',
  gold: 'bg-[var(--jt-gold-500)]',
  terra: 'bg-[var(--jt-terra-500)]',
};
const ACCENT_SOFT: Record<Accent, string> = {
  olive: 'bg-[var(--jt-olive-50)] text-[var(--jt-olive-700)]',
  gold: 'bg-[var(--jt-gold-100)] text-[var(--jt-gold-700)]',
  terra: 'bg-[var(--jt-terra-100)] text-[var(--jt-terra-700)]',
};

const FLOW_SECTIONS = [
  {
    ref: '2.1',
    icon: Info,
    titleAr: 'هويتنا',
    titleEn: 'Who We Are',
    bodyAr: 'منصّة غير ربحية بناها المجتمع، تربط 15.2 مليون فلسطيني حول العالم عبر شجرة عائلة واحدة موحّدة.',
    bodyEn: 'A non-profit, community-built platform connecting the 15.2 million Palestinians scattered across the world through one unified family tree.',
    href: '/about',
  },
  {
    ref: '2.2',
    icon: Heart,
    titleAr: 'أهدافنا',
    titleEn: 'Why Are We Doing This',
    bodyAr: 'الهوية، وحقّ العودة، ولماذا توثيق تاريخ العائلة مهمّ الآن أكثر من أي وقت مضى.',
    bodyEn: 'Identity, the right of return, and why documenting family history matters now more than ever.',
    href: '/why',
  },
  {
    ref: '2.3',
    icon: RouteIcon,
    titleAr: 'كيف نحقق أهدافنا',
    titleEn: 'How Does This Work',
    bodyAr: 'بناء شجرتك، والخصوصية وضوابط الوصول، وكيف ترتبط الأشجار الفردية بشجرة العائلة الفلسطينية.',
    bodyEn: 'Building your tree, privacy and access controls, and how individual trees link into the Palestinian Family Tree.',
    href: '/how',
  },
  {
    ref: '2.4',
    icon: Mail,
    titleAr: 'تواصل معنا',
    titleEn: 'Contact Us',
    bodyAr: 'أسئلة، شراكات، تصحيحات، ودعم — تواصل مع الفريق القائم على هذه المنصّة.',
    bodyEn: 'Questions, partnerships, corrections, and support — reach the team behind the platform.',
    href: '/contact',
  },
];

const STATS = [
  {
    value: 15.2,
    decimals: 1,
    suffix: 'M',
    labelAr: 'فلسطيني في الشتات',
    labelEn: 'Palestinians in the diaspora',
  },
  {
    value: 530,
    decimals: 0,
    suffix: '+',
    labelAr: 'قرية فلسطينية دُمِّرت بالكامل على يد إسرائيل عام 1948',
    labelEn: 'Palestinian villages completely demolished by Israel in 1948',
  },
];

type Village = { id: string; name_ar: string; name_en: string | null; district_ar: string | null };

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

export function HomeClient({ villages = [] }: { villages?: Village[] }) {
  const { t, locale, dir } = useLocale();
  const names = (villages.length >= 6 ? villages : FALLBACK_VILLAGES).slice(0, 7);
  const isAR = locale === 'ar';
  const Arrow = isAR ? ArrowLeft : ArrowRight;
  const reduce = useReducedMotion();

  const rise: Variants = reduce
    ? { hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.4 } } }
    : {
        hidden: { opacity: 0, y: 22 },
        show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
      };
  const stagger: Variants = { hidden: {}, show: { transition: { staggerChildren: reduce ? 0 : 0.09 } } };

  return (
    <div dir={dir} className="relative min-h-screen bg-[var(--jt-stone-50)] text-[var(--foreground)]">
      {/* decorative background wash */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_top,_var(--jt-olive-100)_0%,_transparent_60%)] opacity-70" />
        <div className="absolute inset-x-0 bottom-0 h-[420px] bg-[radial-gradient(ellipse_at_bottom,_var(--jt-gold-100)_0%,_transparent_60%)] opacity-50" />
      </div>

      <div className="mx-auto max-w-screen-2xl px-5 py-10 lg:flex lg:items-start lg:gap-10">
        {/* Sidebar — the four narrative-flow anchors, alongside the content instead of above it */}
        <aside className="mb-8 lg:sticky lg:top-20 lg:mb-0 lg:w-60 lg:shrink-0">
          <div className="rounded-2xl border border-[var(--jt-stone-200)]/70 bg-[var(--card)]/80 p-3 shadow-[var(--jt-shadow-sm)] backdrop-blur-sm lg:p-4">
            <p className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--jt-olive-600)]">
              {t('في هذه الصفحة', 'On this page')}
            </p>
            <nav className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-1 lg:overflow-visible">
              {FLOW_SECTIONS.map((s, i) => {
                const accent = ACCENTS[i];
                return (
                  <a
                    key={s.ref}
                    href={`#${s.ref}`}
                    className="group flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-2.5 py-2 text-sm font-medium text-[var(--jt-stone-700)] transition-all hover:translate-x-0.5 hover:bg-[var(--jt-olive-50)] hover:text-[var(--jt-olive-800)] lg:whitespace-normal rtl:hover:-translate-x-0.5"
                  >
                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-transform group-hover:scale-110 ${ACCENT_SOFT[accent]}`}>
                      <s.icon className="h-3.5 w-3.5" />
                    </span>
                    {t(s.titleAr, s.titleEn)}
                  </a>
                );
              })}
            </nav>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {/* Hero */}
          <motion.section
            initial="hidden"
            animate="show"
            variants={stagger}
            className="relative overflow-hidden rounded-[28px] border border-[var(--jt-olive-100)] bg-[var(--card)]/60 px-6 py-10 shadow-[var(--jt-shadow-sm)] md:px-10 md:py-14"
          >
            <div aria-hidden className="jt-tatreez-dark pointer-events-none absolute inset-0 -z-10 opacity-[0.035]" />
            <div
              aria-hidden
              className="jt-breathe pointer-events-none absolute -top-24 h-72 w-72 rounded-full blur-3xl ltr:-right-16 rtl:-left-16"
              style={{ background: 'radial-gradient(circle, var(--jt-gold-300) 0%, transparent 70%)' }}
            />
            <div
              aria-hidden
              className="jt-float pointer-events-none absolute -bottom-16 h-56 w-56 rounded-full opacity-40 blur-3xl ltr:-left-10 rtl:-right-10"
              style={{ background: 'radial-gradient(circle, var(--jt-terra-300) 0%, transparent 70%)' }}
            />

            <div className="relative grid items-center gap-10 md:grid-cols-2">
              <motion.div variants={rise} className="order-2 flex justify-center md:order-1">
                <div
                  className="relative aspect-[4/5] w-full max-w-sm"
                  style={{
                    WebkitMaskImage: 'radial-gradient(ellipse 78% 82% at 50% 46%, black 20%, transparent 100%)',
                    maskImage: 'radial-gradient(ellipse 78% 82% at 50% 46%, black 20%, transparent 100%)',
                  }}
                >
                  {/* mix-blend-mode: multiply drops the photo's light stone-wall background
                      into the page's own tone, so only the darker hand+key silhouette reads —
                      no visible rectangle/edge, unlike a plain opacity fade. */}
                  <Image
                    src="/images/hero-key.jpg"
                    alt={t(
                      '',
                      "An elder's hand and a child's hand together holding an old iron key — the key of return",
                    )}
                    fill
                    sizes="(max-width: 768px) 90vw, 400px"
                    className="object-cover grayscale contrast-75 brightness-110"
                    style={{ mixBlendMode: 'multiply' }}
                    priority
                  />
                </div>
              </motion.div>

              <div className="order-1 md:order-2">
                <motion.div variants={rise} className="mb-3 flex flex-col items-start gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-[var(--jt-olive-200)] bg-[var(--jt-olive-50)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--jt-olive-700)]">
                    {t('من الفلسطينيين، عن الفلسطينيين، للفلسطينيين', 'By Palestinians, For Palestinians')}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--jt-olive-200)] bg-[var(--jt-olive-50)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--jt-olive-700)]">
                      {t('غير ربحيّة', 'Non-profit')}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--jt-olive-200)] bg-[var(--jt-olive-50)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--jt-olive-700)]">
                      {t('مجّانية للأبد', 'Free forever')}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--jt-olive-200)] bg-[var(--jt-olive-50)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--jt-olive-700)]">
                      {t('بدون إعلانات', 'No ads')}
                    </span>
                  </div>
                </motion.div>
                <motion.h1
                  variants={rise}
                  className="text-[clamp(2rem,5vw,3.4rem)] font-bold leading-tight text-[var(--jt-olive-900)]"
                  style={{ fontFamily: 'var(--jt-font-display)' }}
                >
                  {isAR ? (
                    <>
                      شجرة عائلة واحدة لـ
                      <span className="relative inline-block">
                        جميع الفلسطينيين
                        <svg aria-hidden viewBox="0 0 220 10" preserveAspectRatio="none" className="absolute -bottom-1 right-0 h-2.5 w-full">
                          <path d="M4 7 Q 110 1 216 6" fill="none" stroke="var(--jt-gold-400)" strokeWidth="4" strokeLinecap="round" />
                        </svg>
                      </span>{' '}
                      في كل مكان.
                    </>
                  ) : (
                    <>
                      One family tree for{' '}
                      <span className="relative inline-block">
                        all Palestinians
                        <svg aria-hidden viewBox="0 0 220 10" preserveAspectRatio="none" className="absolute -bottom-1 left-0 h-2.5 w-full">
                          <path d="M4 7 Q 110 1 216 6" fill="none" stroke="var(--jt-gold-400)" strokeWidth="4" strokeLinecap="round" />
                        </svg>
                      </span>
                      , everywhere.
                    </>
                  )}
                </motion.h1>
                <motion.p variants={rise} className="mt-5 max-w-lg text-[var(--jt-stone-700)]">
                  {t(
                    'كل عائلة تُسجَّل هي عائلة تُذكر. ابحث عن أقاربك، وابنِ شجرتك، وأعد ربطها بشجرة العائلة الفلسطينية الأوسع — بيتًا بيتًا، وقريةً قريةً، وجيلًا بعد جيل.',
                    'Every family recorded is a family remembered. Search for your relatives, build your tree, and reconnect it to the wider Palestinian Family Tree — one household, one village, one generation at a time.',
                  )}
                </motion.p>
                <motion.div variants={rise} className="mt-7 flex flex-wrap gap-3">
                  <Link
                    href="/sign-up"
                    className="jt-btn-shine inline-flex items-center gap-2 rounded-full bg-[var(--jt-gold-500)] px-6 py-3 text-sm font-semibold text-[var(--jt-stone-50)] shadow-[var(--jt-shadow-sm)] transition-all hover:-translate-y-0.5 hover:bg-[var(--jt-gold-600)] hover:shadow-[var(--jt-shadow-md)]"
                  >
                    {t('ابدأ بناء شجرة عائلتك', 'Start your own family tree')}
                  </Link>
                  <Link
                    href="/search"
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--jt-olive-300)] px-6 py-3 text-sm font-semibold text-[var(--jt-olive-800)] transition-all hover:-translate-y-0.5 hover:bg-[var(--jt-olive-50)]"
                  >
                    {t('ابحث في شجرة العائلة الفلسطينية', 'Search the Palestinian Family Tree')}
                  </Link>
                </motion.div>

                <motion.div variants={rise} className="mt-9 flex flex-wrap gap-x-10 gap-y-4 border-t border-[var(--jt-olive-100)] pt-6">
                  {STATS.map((s) => (
                    <div key={s.labelEn}>
                      <div
                        className="text-3xl italic text-[var(--jt-olive-800)] md:text-4xl"
                        style={{ fontFamily: 'var(--jt-font-display)', fontWeight: 500 }}
                      >
                        <CountUp value={s.value} decimals={s.decimals} suffix={s.suffix} />
                      </div>
                      <div className="mt-0.5 max-w-[16rem] text-xs text-[var(--jt-stone-600)]">{t(s.labelAr, s.labelEn)}</div>
                    </div>
                  ))}
                </motion.div>
              </div>
            </div>
          </motion.section>

          {/* Diaspora map */}
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.6 }}
            className="mt-8 rounded-3xl border border-[var(--jt-stone-200)] bg-[var(--card)] p-5 shadow-[var(--jt-shadow-sm)] md:p-6"
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
              {names.map((v) => (
                <span
                  key={v.id}
                  className="rounded-full bg-[var(--jt-olive-50)] px-2.5 py-1 font-medium text-[var(--jt-olive-700)]"
                  style={{ fontFamily: 'var(--jt-font-display)' }}
                >
                  {t(v.name_ar, v.name_en ?? v.name_ar)}
                </span>
              ))}
            </div>
          </motion.section>

          {/* Who We Are -> Why -> How -> Contact — one connected vertical flow, per the wireframe */}
          <section className="max-w-2xl pb-16 pt-10">
            <div className="flex flex-col">
              {FLOW_SECTIONS.map((s, i) => {
                const accent = ACCENTS[i];
                return (
                  <motion.div
                    key={s.ref}
                    id={s.ref}
                    className="scroll-mt-24"
                    initial={{ opacity: 0, y: 18 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-60px' }}
                    transition={{ duration: 0.55, delay: reduce ? 0 : i * 0.05 }}
                  >
                    <div className="flex gap-5">
                      <div className="flex flex-col items-center">
                        <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[var(--jt-stone-50)] shadow-[var(--jt-shadow-sm)] ${ACCENT_BG[accent]}`}>
                          <s.icon className="h-5 w-5" />
                        </span>
                        {i < FLOW_SECTIONS.length - 1 && (
                          <span aria-hidden className="my-1 w-px flex-1 bg-[var(--jt-olive-200)]" style={{ minHeight: 56 }} />
                        )}
                      </div>
                      <div className="group -mt-1 flex-1 rounded-2xl p-4 pb-9 transition-colors hover:bg-[var(--jt-olive-50)]/50">
                        <h2 className="text-xl font-bold text-[var(--jt-olive-900)]" style={{ fontFamily: 'var(--jt-font-display)' }}>
                          {t(s.titleAr, s.titleEn)}
                        </h2>
                        <p className="mt-2 text-sm text-[var(--jt-stone-700)]">{t(s.bodyAr, s.bodyEn)}</p>
                        <Link
                          href={s.href}
                          className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--jt-olive-700)] transition-transform group-hover:gap-2 hover:text-[var(--jt-olive-900)]"
                        >
                          {t('اقرأ المزيد', 'Learn more')}
                          <Arrow className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      {/* Footer CTA banner + village panorama */}
      <div className="mx-auto max-w-screen-2xl px-5 pb-12">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[var(--jt-terra-50)] via-[var(--jt-gold-50)] to-[var(--jt-olive-50)] text-center shadow-[var(--jt-shadow-sm)]"
        >
          <div aria-hidden className="jt-tatreez-dark absolute inset-0 opacity-[0.05]" />
          <div className="relative px-6 pt-10 pb-2">
            <span className="jt-float relative inline-flex h-12 w-12 items-center justify-center rounded-full bg-[var(--jt-olive-600)] text-white shadow-[var(--jt-shadow-md)]">
              <Sprout className="h-5 w-5" />
            </span>
            <p className="relative mx-auto mt-4 max-w-md text-lg text-[var(--jt-stone-800)]" style={{ fontFamily: 'var(--jt-font-display)' }}>
              {t(
                'لا يمكن لقصة عائلتك ان تنسى أو ان تمحى. لن يستغرق البدء ببناء شجرة عائلتك أكثر من عشر دقائق.',
                "Your family's story belongs here. It takes about ten minutes to begin.",
              )}
            </p>
            <Link
              href="/sign-up"
              className="jt-btn-shine relative mt-5 inline-flex items-center gap-2.5 rounded-xl bg-[var(--jt-gold-500)] px-8 py-3.5 text-[15px] font-semibold text-white shadow-[0_14px_32px_-10px_var(--jt-gold-500)] transition-all duration-300 hover:-translate-y-1 hover:bg-[var(--jt-gold-600)] hover:shadow-[0_20px_40px_-10px_var(--jt-gold-600)] active:translate-y-0"
            >
              {t('ابدأ بناء شجرة عائلتك', 'Create your family tree')}
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
