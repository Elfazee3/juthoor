'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
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

// Scatter positions for the diaspora map dots (percent of the box).
const DOTS = [
  [10, 22], [26, 58], [41, 30], [55, 66], [70, 40], [85, 24],
  [16, 76], [61, 16], [90, 62], [35, 82], [78, 74], [49, 46],
];

const START_CARDS = [
  { icon: Info, titleAr: 'من نحن', titleEn: 'Who we are', subAr: 'رسالتنا والقصة وراء هذه المنصّة', subEn: 'Our mission and the story behind this platform', href: '/about' },
  { icon: Heart, titleAr: 'لماذا نفعل هذا', titleEn: 'Why we do this', subAr: 'الهوية، حقّ العودة، ولماذا هذا مهمّ الآن', subEn: 'Identity, the right of return, and why it matters now', href: '/why' },
  { icon: Route, titleAr: 'كيف يعمل هذا', titleEn: 'How it works', subAr: 'بناء شجرتك، الخصوصية، والشجرة الأم', subEn: 'Building your tree, privacy, and the master tree', href: '/how' },
  { icon: Mail, titleAr: 'تواصل معنا', titleEn: 'Contact us', subAr: 'أسئلة، شراكات، ودعم', subEn: 'Questions, partnerships, and support', href: '/contact' },
];

export function HomeClient({ villages }: { villages: Village[] }) {
  const { t, locale, dir } = useLocale();
  const isAR = locale === 'ar';
  const Arrow = isAR ? ArrowLeft : ArrowRight;
  const names = (villages.length >= 6 ? villages : FALLBACK_VILLAGES).slice(0, 7);

  return (
    <div dir={dir} className="relative bg-[var(--background)] text-[var(--foreground)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--jt-olive-100)_0%,_transparent_55%)] opacity-60" />
        <div className="absolute inset-x-0 bottom-0 h-[420px] bg-[radial-gradient(ellipse_at_bottom,_var(--jt-gold-100)_0%,_transparent_60%)] opacity-50" />
      </div>

      <div className="mx-auto max-w-4xl px-5 py-10 md:py-14">
        {/* ═══════ HERO ═══════ */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="relative overflow-hidden rounded-3xl bg-[var(--jt-olive-700)] px-7 py-9 md:px-10 md:py-12"
        >
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-1.5"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, var(--jt-terra-500) 0 8px, var(--jt-gold-500) 8px 16px, var(--jt-olive-200) 16px 24px)',
            }}
          />
          <span className="inline-block rounded-full bg-white/12 px-3 py-1 text-[11px] font-medium text-white/75">
            {t('غير ربحيّة · عربيّة أوّلًا · بلا إعلانات', 'Non-profit · Arabic-first · ad-free')}
          </span>
          <h1
            className="mt-3 max-w-2xl text-[clamp(1.9rem,5vw,3rem)] font-bold leading-[1.15] text-white"
            style={{ fontFamily: isAR ? 'var(--jt-font-display)' : 'var(--jt-font-latin)' }}
          >
            {t('شجرة عائلة واحدة لكلّ فلسطيني، في كلّ مكان', 'One family tree for every Palestinian, everywhere')}
          </h1>
          <p className="mt-2 text-base text-white/70" dir={isAR ? 'ltr' : 'rtl'}>
            {t('One family tree for every Palestinian, everywhere', 'شجرة عائلة واحدة لكلّ فلسطيني، في كلّ مكان')}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/sign-up"
              className="group inline-flex items-center gap-2 rounded-lg bg-[var(--jt-terra-500)] px-5 py-2.5 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[var(--jt-terra-600)]"
            >
              <Sprout className="h-4 w-4" />
              {t('أنشئ شجرة عائلتي', 'Start my family tree')}
              <Arrow className="h-4 w-4 transition-transform group-hover:translate-x-0.5 rtl:group-hover:-translate-x-0.5" />
            </Link>
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 rounded-lg border border-white/40 px-5 py-2.5 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10"
            >
              <Search className="h-4 w-4" />
              {t('ابحث في الشجرة', 'Search the tree')}
            </Link>
          </div>

          {/* hero stats */}
          <div className="mt-7 flex flex-wrap gap-x-10 gap-y-4 border-t border-white/15 pt-5">
            <HeroStat value="15.2M" label={t('فلسطيني في الشتات', 'Palestinians in diaspora')} />
            <HeroStat value="530+" label={t('قرية ومدينة موثّقة', 'villages & cities documented')} />
            <HeroStat value={t('مجّاني', 'Free')} label={t('للأبد، بلا إعلانات', 'forever, ad-free')} />
          </div>
        </motion.section>

        {/* ═══════ DIASPORA MAP ═══════ */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.55 }}
          className="mt-4 rounded-2xl border border-[var(--jt-stone-200)] bg-[var(--card)] p-4 md:p-5"
        >
          <div className="flex flex-col items-center gap-4 sm:flex-row">
            <div className="relative h-28 w-full flex-1 overflow-hidden rounded-xl bg-[var(--jt-stone-100)] sm:h-32">
              {DOTS.map(([x, y], i) => (
                <motion.span
                  key={i}
                  className="absolute h-1.5 w-1.5 rounded-full bg-[var(--jt-terra-500)]"
                  style={{ left: `${x}%`, top: `${y}%` }}
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 2.6, delay: i * 0.15, repeat: Infinity, ease: 'easeInOut' }}
                />
              ))}
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
            {names.map((v) => (
              <span
                key={v.id}
                className="rounded-full bg-[var(--jt-olive-50)] px-2 py-0.5 font-medium text-[var(--jt-olive-700)]"
                style={{ fontFamily: 'var(--jt-font-display)' }}
              >
                {v.name_ar}
              </span>
            ))}
          </div>
        </motion.section>

        {/* ═══════ WHERE TO START ═══════ */}
        <div className="mb-3 mt-8 flex items-baseline gap-2">
          <h2 className="text-lg font-bold text-[var(--jt-olive-900)]" style={{ fontFamily: 'var(--jt-font-display)' }}>
            {t('من أين تريد أن تبدأ؟', 'Where would you like to start?')}
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {START_CARDS.map((c, i) => {
            const Icon = c.icon;
            const isMail = c.href.startsWith('mailto:');
            const cls =
              'group block rounded-2xl border border-[var(--jt-stone-200)] bg-[var(--card)] p-4 transition-all hover:-translate-y-0.5 hover:border-[var(--jt-olive-400)] hover:shadow-[var(--jt-shadow-sm)]';
            const inner = (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-30px' }}
                transition={{ duration: 0.4, delay: (i % 2) * 0.06 }}
              >
                <Icon className="mb-2 h-5 w-5 text-[var(--jt-olive-600)]" />
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
          initial={{ opacity: 0, y: 14 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5 }}
          className="mt-8 rounded-2xl bg-[var(--jt-terra-50)] px-6 py-7 text-center"
        >
          <p className="text-[15px] text-[var(--jt-stone-800)]">
            {t('قصّة عائلتك تنتمي إلى هنا. يستغرق البدء حوالي عشر دقائق.', "Your family's story belongs here. It takes about ten minutes to begin.")}
          </p>
          <Link
            href="/sign-up"
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-[var(--jt-terra-500)] px-6 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:bg-[var(--jt-terra-600)]"
          >
            {t('أنشئ شجرة عائلتك', 'Create your family tree')}
            <Arrow className="h-4 w-4" />
          </Link>
        </motion.section>
      </div>
    </div>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-xl font-bold text-white" style={{ fontFamily: 'var(--jt-font-display)' }}>
        {value}
      </p>
      <p className="text-[11px] text-white/65">{label}</p>
    </div>
  );
}
