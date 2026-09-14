'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  Heart,
  Image as ImageIcon,
  Info,
  Mail,
  MapPin,
  Route as RouteIcon,
  TreeDeciduous,
  Users,
  UserSearch,
} from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import { LocaleToggle } from '@/components/LocaleToggle';
import { CountUp } from '@/components/home/CountUp';

/**
 * Bilingual homepage, structured after the platform's own hand-drawn Home
 * Page wireframe ("1 E Home Page.pdf") and FRS Appendix 2 ("Front-End GUI
 * Design", Module 2.0 — Home Page):
 *
 *  Top bar: Home / Trees / Individuals / Families / VCC / Picture Archive /
 *           Document Archive  .........................  Log In / Register
 *  Sidebar: [logo]  Who We Are | Why Are We Doing This | How Does This Work | Contact Us
 *  Body:    Who We Are -> Why Are We Doing This -> How Does This Work -> Contact Us,
 *           drawn in the wireframe as one connected vertical flow, not a card grid.
 *
 * Uses the site's existing LocaleContext (useLocale/t) and LocaleToggle so it
 * behaves like every other page — Arabic titles reuse the exact strings
 * already established on /about, /why, /how, /contact for consistency.
 *
 * Standalone preview at /home-en — not yet linked from the live nav.
 */

type NavItem = { labelAr: string; labelEn: string; href: string; icon: typeof TreeDeciduous | null; available: boolean };

const MODULE_NAV: NavItem[] = [
  { labelAr: 'الرئيسية', labelEn: 'Home', href: '/home-en', icon: null, available: true },
  { labelAr: 'الشجرة', labelEn: 'Trees', href: '/tree', icon: TreeDeciduous, available: true },
  { labelAr: 'الأفراد', labelEn: 'Individuals', href: '/search', icon: UserSearch, available: true },
  { labelAr: 'العائلات', labelEn: 'Families', href: '/families', icon: Users, available: true },
  { labelAr: 'القرى والمدن', labelEn: 'VCC', href: '/villages', icon: MapPin, available: true },
  { labelAr: 'أرشيف الصور', labelEn: 'Picture Archive', href: '#', icon: ImageIcon, available: false },
  { labelAr: 'أرشيف الوثائق', labelEn: 'Document Archive', href: '#', icon: FileText, available: false },
];

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
    titleAr: 'من نحن',
    titleEn: 'Who We Are',
    bodyAr: 'منصّة غير ربحية بناها المجتمع، تربط 15.2 مليون فلسطيني حول العالم عبر شجرة عائلة واحدة موحّدة.',
    bodyEn: 'A non-profit, community-built platform connecting the 15.2 million Palestinians scattered across the world through one unified family tree.',
    href: '/about',
  },
  {
    ref: '2.2',
    icon: Heart,
    titleAr: 'لماذا نفعل هذا',
    titleEn: 'Why Are We Doing This',
    bodyAr: 'الهوية، وحقّ العودة، ولماذا توثيق تاريخ العائلة مهمّ الآن أكثر من أي وقت مضى.',
    bodyEn: 'Identity, the right of return, and why documenting family history matters now more than ever.',
    href: '/why',
  },
  {
    ref: '2.3',
    icon: RouteIcon,
    titleAr: 'كيف يعمل هذا',
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

export function HomeEnClient() {
  const { t, locale, dir } = useLocale();
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
    <div
      dir={dir}
      lang={locale}
      className="relative min-h-screen bg-[var(--jt-stone-50)]"
      style={{ fontFamily: isAR ? 'var(--jt-font-arabic)' : 'var(--jt-font-latin)' }}
    >
      {/* decorative background wash */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(circle_at_top,_var(--jt-olive-100)_0%,_transparent_60%)] opacity-70" />
        <div className="absolute inset-x-0 bottom-0 h-[420px] bg-[radial-gradient(ellipse_at_bottom,_var(--jt-gold-100)_0%,_transparent_60%)] opacity-50" />
      </div>

      {/* Preview notice */}
      <div className="bg-[var(--jt-olive-900)] px-4 py-2 text-center text-xs font-medium text-[var(--jt-olive-100)]">
        {t(
          'معاينة الصفحة الرئيسية — مبنية وفق مخطّط الصفحة الرئيسية للمنصّة والملحق 2 من وثيقة المتطلّبات · الوحدة 2.0. غير مرتبطة بالموقع الحالي بعد.',
          "Homepage preview — structured per the platform's Home Page wireframe and FRS Appendix 2 · Module 2.0. Not yet linked from the live site.",
        )}
      </div>

      {/* Top bar — module nav + login */}
      <header className="sticky top-0 z-40 border-b border-[var(--jt-stone-200)]/70 bg-[var(--background)]/90 backdrop-blur">
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-px opacity-50"
          style={{
            backgroundImage:
              'linear-gradient(to right, transparent, var(--jt-olive-400), var(--jt-gold-400), var(--jt-terra-400), transparent)',
          }}
        />
        <div className="mx-auto flex h-14 max-w-screen-2xl items-center gap-1 px-5">
          <Link href="/home-en" className="group me-2 flex shrink-0 items-center gap-2">
            <span
              aria-hidden
              className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[var(--jt-olive-600)] text-[var(--jt-stone-50)] transition-transform group-hover:-rotate-6"
            >
              <TreeDeciduous className="h-4 w-4" />
            </span>
            <span className="text-sm font-bold text-[var(--jt-olive-800)]" style={{ fontFamily: 'var(--jt-font-display)' }}>
              Juthoor
            </span>
          </Link>
          <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
            {MODULE_NAV.map((item) => (
              <Link
                key={item.labelEn}
                href={item.available ? item.href : '#'}
                aria-disabled={!item.available}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                  item.available
                    ? 'text-[var(--jt-stone-700)] hover:bg-[var(--jt-olive-50)] hover:text-[var(--jt-olive-700)]'
                    : 'cursor-default text-[var(--jt-stone-400)]'
                }`}
                onClick={(e) => {
                  if (!item.available) e.preventDefault();
                }}
              >
                {item.icon && <item.icon className="h-4 w-4" />}
                {t(item.labelAr, item.labelEn)}
                {!item.available && (
                  <span className="ms-1 rounded-full bg-[var(--jt-stone-100)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--jt-stone-500)]">
                    {t('قريبًا', 'Soon')}
                  </span>
                )}
              </Link>
            ))}
          </nav>
          <LocaleToggle className="me-2 hidden sm:inline-flex" />
          <Link
            href="/login"
            className="jt-btn-shine shrink-0 rounded-full bg-[var(--jt-gold-500)] px-4 py-2 text-sm font-semibold text-[var(--jt-stone-50)] shadow-[var(--jt-shadow-sm)] transition-all hover:-translate-y-0.5 hover:bg-[var(--jt-gold-600)] hover:shadow-[var(--jt-shadow-md)]"
          >
            {t('تسجيل الدخول / التسجيل', 'Log In / Register')}
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-screen-2xl px-5 py-10 lg:flex lg:items-start lg:gap-10">
        {/* Sidebar — the four narrative-flow anchors, alongside the content instead of above it */}
        <aside className="mb-8 lg:sticky lg:top-20 lg:mb-0 lg:w-60 lg:shrink-0">
          <div className="rounded-2xl border border-[var(--jt-stone-200)]/70 bg-[var(--card)]/80 p-3 shadow-[var(--jt-shadow-sm)] backdrop-blur-sm lg:p-4">
            <div className="mb-2 flex items-center justify-between px-1 sm:hidden">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--jt-olive-600)]">
                {t('في هذه الصفحة', 'On this page')}
              </p>
              <LocaleToggle />
            </div>
            <p className="mb-2 hidden px-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--jt-olive-600)] sm:block">
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
                      'يد جدّ ويد حفيد تمسكان معًا مفتاحًا حديديًا قديمًا — مفتاح العودة',
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
                    {t('من الفلسطينيين، للفلسطينيين', 'By Palestinians, For Palestinians')}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--jt-olive-200)] bg-[var(--jt-olive-50)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--jt-olive-700)]">
                      {t('غير ربحيّة', 'Non-profit')}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--jt-olive-200)] bg-[var(--jt-olive-50)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--jt-olive-700)]">
                      {t('مجّانية للأبد', 'Free forever')}
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--jt-olive-200)] bg-[var(--jt-olive-50)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--jt-olive-700)]">
                      {t('بلا إعلانات', 'No ads')}
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
                      شجرة عائلة واحدة لـ{' '}
                      <span className="relative inline-block">
                        كل الفلسطينيين
                        <svg aria-hidden viewBox="0 0 220 10" preserveAspectRatio="none" className="absolute -bottom-1 right-0 h-2.5 w-full">
                          <path d="M4 7 Q 110 1 216 6" fill="none" stroke="var(--jt-gold-400)" strokeWidth="4" strokeLinecap="round" />
                        </svg>
                      </span>
                      ، في كل مكان.
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
                    {t('ابدأ شجرة عائلتك الخاصة', 'Start your own family tree')}
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

      {/* Footer */}
      <footer className="relative border-t border-[var(--jt-stone-200)] bg-[var(--jt-stone-50)] px-5 py-8 text-center text-xs text-[var(--jt-stone-500)]">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-px opacity-50"
          style={{
            backgroundImage:
              'linear-gradient(to right, transparent, var(--jt-olive-400), var(--jt-gold-400), var(--jt-terra-400), transparent)',
          }}
        />
        {t('منصّة جذور الفلسطينية — معاينة الصفحة الرئيسية.', 'Palestinian Roots Platform (Juthoor) — homepage preview.')}{' '}
        <Link href="/" className="underline hover:text-[var(--jt-olive-700)]">
          {t('العودة إلى الموقع الحالي', 'Back to the live site')}
        </Link>
      </footer>
    </div>
  );
}
