'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calendar,
  ChevronRight,
  ExternalLink,
  FileText,
  Landmark,
  MapPin,
  Plus,
  Tent,
  TreePine,
  Users,
} from 'lucide-react';
import { useLocale } from '@/contexts/LocaleContext';
import type {
  PlaceDetail,
  PlacePerson,
  PlaceProfile,
  SurnameGroupItem,
} from '@/data/user/places';

function looksArabic(s: string | null): boolean {
  if (!s) return false;
  return /[؀-ۿ]/.test(s);
}

const TYPE_META: Record<
  string,
  { ar: string; en: string; icon: React.ComponentType<{ className?: string }> }
> = {
  village: { ar: 'قرية', en: 'Village', icon: MapPin },
  city: { ar: 'مدينة', en: 'City', icon: Users },
  clan_locality: { ar: 'عشيرة', en: 'Clan / 3achira', icon: Tent },
  khirba: { ar: 'خربة', en: 'Ruin / historic site', icon: MapPin },
};

export function VillageDetailClient({
  place,
  persons,
  surnames,
  profile,
}: {
  place: PlaceDetail;
  persons: PlacePerson[];
  surnames: SurnameGroupItem[];
  profile?: PlaceProfile | null;
}) {
  const { t, locale, dir } = useLocale();
  const Arrow = locale === 'ar' ? ArrowLeft : ArrowRight;
  const Back = locale === 'ar' ? ChevronRight : ArrowLeft;

  const pick = (ar: string | null | undefined, en: string | null | undefined) =>
    (locale === 'ar' ? ar || en : en || ar) || null;

  const historyText = pick(profile?.historical_overview_ar, profile?.historical_overview_en);
  const remainsText = pick(profile?.what_remains_ar, profile?.what_remains_en);
  const sourceText = pick(profile?.source_attribution_ar, profile?.source_attribution_en);
  const externalLinks = profile?.external_links ?? [];
  const isDepopulated = Boolean(place.is_depopulated || place.depopulated_year);
  const hasEditorial = Boolean(historyText || remainsText || profile?.population_count);

  const meta = TYPE_META[place.place_type ?? 'village'] ?? TYPE_META.village;
  const TypeIcon = meta.icon;

  const isArabicName = looksArabic(place.name_ar);
  const heroAr = isArabicName ? place.name_ar : place.name_en ?? place.name_ar;
  const heroEn = isArabicName ? place.name_en : null;
  const placeholder = !isArabicName; // name_ar still equals Latin → flag for editorial pass

  const treesCount = new Set(persons.map((p) => p.tree_id)).size;

  return (
    <div dir={dir} className="relative min-h-full bg-[var(--background)]">
      {/* Hero band */}
      <div className="relative overflow-hidden border-b border-[var(--jt-olive-200)]/40 bg-gradient-to-b from-[var(--jt-olive-50)] to-transparent">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute -end-32 top-0 h-72 w-72 rounded-full bg-[var(--jt-olive-100)] opacity-50 blur-2xl" />
          <div className="absolute -start-20 bottom-0 h-56 w-56 rounded-full bg-[var(--jt-gold-100)] opacity-60 blur-2xl" />
        </div>
        <div className="relative mx-auto max-w-5xl px-6 py-10 md:px-10 md:py-14">
          <Link
            href="/villages"
            className="mb-6 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--jt-olive-700)] hover:text-[var(--jt-olive-900)]"
          >
            <Back className="h-3.5 w-3.5" />
            {t('كل الأماكن', 'All places')}
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          >
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--jt-olive-200)]/70 bg-[var(--card)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--jt-olive-700)]">
                <TypeIcon className="h-3 w-3" />
                {t(meta.ar, meta.en)}
              </span>
              {place.depopulated_year && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--jt-terra-50)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--jt-terra-600)]">
                  <Calendar className="h-3 w-3" />
                  {place.depopulated_year}
                </span>
              )}
              {place.is_depopulated && !place.depopulated_year && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--jt-terra-50)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--jt-terra-600)]">
                  {t('قرية مهجّرة', 'Depopulated 1948')}
                </span>
              )}
              {placeholder && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--jt-stone-100)] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--jt-stone-600)]">
                  {t('في انتظار الاسم العربي', 'AR name pending')}
                </span>
              )}
            </div>
            <h1
              className="text-5xl font-bold leading-[1.05] text-[var(--jt-olive-900)] md:text-7xl"
              style={{
                fontFamily: isArabicName
                  ? 'var(--jt-font-display)'
                  : 'var(--jt-font-latin)',
              }}
            >
              {heroAr}
            </h1>
            {heroEn && (
              <p className="mt-2 text-lg uppercase tracking-[0.18em] text-[var(--jt-stone-500)]">
                {heroEn}
              </p>
            )}
            {place.district_ar && (
              <p className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--jt-stone-700)]">
                <MapPin className="h-3.5 w-3.5 text-[var(--jt-olive-600)]" />
                {locale === 'ar'
                  ? place.district_ar
                  : place.district_en ?? place.district_ar}
              </p>
            )}
          </motion.div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-5xl px-6 py-10 md:px-10 md:py-14">
        {/* Three stat cards */}
        <div className="mb-10 grid gap-3 sm:grid-cols-3">
          <Stat color="olive" label={t('أبناء هذا المكان', 'People from here')} value={persons.length} />
          <Stat color="gold" label={t('عائلات', 'Family names')} value={surnames.length} />
          <Stat color="terra" label={t('شجرات تربطه', 'Trees rooted here')} value={treesCount} />
        </div>

        {/* Editorial enrichment — only when a place_profile exists */}
        {hasEditorial && (
          <section className="mb-12 space-y-4">
            {profile?.population_count != null && (
              <div className="inline-flex items-baseline gap-2 rounded-2xl border border-[var(--jt-gold-100)]/70 bg-[var(--jt-gold-50)]/60 px-5 py-3">
                <span
                  className="text-3xl font-bold text-[var(--jt-gold-700)]"
                  style={{ fontFamily: 'var(--jt-font-display)' }}
                >
                  {profile.population_count.toLocaleString()}
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--jt-stone-500)]">
                  {profile.population_year
                    ? t(`سكّان القرية (${profile.population_year})`, `Population (${profile.population_year})`)
                    : t('سكّان القرية', 'Population')}
                </span>
              </div>
            )}
            {historyText && (
              <InfoCard
                icon={BookOpen}
                title={t('نظرة تاريخية', 'Historical overview')}
                body={historyText}
                source={sourceText}
              />
            )}
            {remainsText && (
              <InfoCard
                icon={Landmark}
                title={t('ما تبقى اليوم', 'What remains today')}
                body={remainsText}
              />
            )}
          </section>
        )}

        {/* Families from here */}
        <section className="mb-12">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--jt-olive-700)]">
                {t('عائلات', 'Families')}
              </p>
              <h2
                className="text-2xl font-bold text-[var(--jt-olive-900)] md:text-3xl"
                style={{ fontFamily: 'var(--jt-font-display)' }}
              >
                {t('من هذا المكان', 'From this place')}
              </h2>
            </div>
            <span className="text-xs text-[var(--jt-stone-500)]">
              {t(`${surnames.length} لقبًا`, `${surnames.length} surnames`)}
            </span>
          </div>
          {surnames.length === 0 ? (
            <EmptyHint
              ar="لم يُسجَّل أحدٌ من هذا المكان بعد. كن أول من يربط جذوره به."
              en="No families recorded yet. Be the first to link your roots here."
            />
          ) : (
            <div className="flex flex-wrap gap-2">
              {surnames.map((s) => {
                const label = s.surname_ar ?? s.surname_en ?? '';
                if (!label) return null;
                const isAr = looksArabic(label);
                return (
                  <Link
                    key={label}
                    href={`/families/${encodeURIComponent(label)}`}
                    className="group inline-flex items-center gap-2 rounded-full border border-[var(--jt-olive-200)]/70 bg-[var(--card)] px-4 py-2 text-sm transition-all hover:-translate-y-0.5 hover:border-[var(--jt-olive-500)] hover:shadow-[var(--jt-shadow-sm)]"
                  >
                    <span
                      className="font-semibold text-[var(--jt-olive-900)]"
                      style={{
                        fontFamily: isAr
                          ? 'var(--jt-font-display)'
                          : 'var(--jt-font-latin)',
                      }}
                    >
                      {label}
                    </span>
                    <span className="rounded-full bg-[var(--jt-olive-50)] px-2 text-[10px] font-bold text-[var(--jt-olive-700)]">
                      {s.count}
                    </span>
                    <Arrow className="h-3 w-3 text-[var(--jt-stone-400)] transition-colors group-hover:text-[var(--jt-olive-600)]" />
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        {/* People from here */}
        <section className="mb-12">
          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--jt-olive-700)]">
                {t('أفراد', 'People')}
              </p>
              <h2
                className="text-2xl font-bold text-[var(--jt-olive-900)] md:text-3xl"
                style={{ fontFamily: 'var(--jt-font-display)' }}
              >
                {t('سُجِّلوا في هذا المكان', 'Recorded here')}
              </h2>
            </div>
          </div>
          {persons.length === 0 ? (
            <EmptyHint
              ar="لم يُربط أي شخصٍ بهذا المكان بعد."
              en="No person has been linked to this place yet."
            />
          ) : (
            <ul className="grid gap-2 sm:grid-cols-2">
              {persons.map((p, i) => {
                const name =
                  locale === 'ar'
                    ? p.display_name_ar || p.display_name_en
                    : p.display_name_en || p.display_name_ar;
                const initial = (name ?? '·').slice(0, 1);
                return (
                  <motion.li
                    key={p.person_id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(i * 0.02, 0.4) }}
                  >
                    <Link
                      href={`/tree/${p.tree_id}/person/${p.person_id}`}
                      className="group flex items-center gap-3 rounded-2xl border border-[var(--jt-stone-200)] bg-[var(--card)] p-3 text-sm shadow-[var(--jt-shadow-sm)] transition-all hover:-translate-y-0.5 hover:border-[var(--jt-olive-400)]"
                    >
                      <span
                        className={
                          'inline-flex h-9 w-9 flex-none items-center justify-center rounded-full font-bold '
                          + (p.gender === 'F'
                            ? 'bg-[var(--jt-terra-50)] text-[var(--jt-terra-600)]'
                            : 'bg-[var(--jt-olive-100)] text-[var(--jt-olive-800)]')
                        }
                        style={{ fontFamily: 'var(--jt-font-display)' }}
                      >
                        {initial}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-[var(--jt-stone-900)]">
                          {name}
                        </p>
                        <p className="truncate text-[11px] text-[var(--jt-stone-500)]">
                          {p.birth_year ? `${p.birth_year} · ` : ''}
                          {p.tree_name ?? t('شجرة', 'Tree')}
                        </p>
                      </div>
                      <Arrow className="h-3.5 w-3.5 flex-none text-[var(--jt-stone-400)] transition-colors group-hover:text-[var(--jt-olive-600)]" />
                    </Link>
                  </motion.li>
                );
              })}
            </ul>
          )}
        </section>

        {/* External archives + content-sourcing note (for depopulated places) */}
        {(isDepopulated || externalLinks.length > 0) && (
          <section className="mb-12">
            {externalLinks.length > 0 && (
              <>
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.25em] text-[var(--jt-olive-700)]">
                  {t('مصادر خارجية', 'External resources')}
                </p>
                <div className="mb-5 flex flex-wrap gap-2">
                  {externalLinks.map((link) => {
                    const label = pick(link.label_ar, link.label_en) ?? link.url;
                    return (
                      <a
                        key={link.url}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex items-center gap-2 rounded-full border border-[var(--jt-stone-200)] bg-[var(--card)] px-4 py-2 text-sm text-[var(--jt-stone-800)] transition-all hover:-translate-y-0.5 hover:border-[var(--jt-olive-400)] hover:shadow-[var(--jt-shadow-sm)]"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-[var(--jt-olive-600)]" />
                        <span className="font-medium">{label}</span>
                      </a>
                    );
                  })}
                </div>
              </>
            )}
            <div className="rounded-2xl border-s-4 border-[var(--jt-terra-500)] bg-[var(--jt-terra-50)]/40 p-4">
              <p className="mb-1 text-xs font-bold text-[var(--jt-terra-600)]">
                {t('عن مصادر هذه الصفحة', "About this page's sources")}
              </p>
              <p
                className="text-[13px] text-[var(--jt-stone-800)]"
                style={{ lineHeight: locale === 'ar' ? 1.9 : 1.6 }}
              >
                {t(
                  'النص التاريخي في هذه الصفحة مكتوب بشكل مستقل من مصادر متاحة للعامة، ولا ينسخ محتوى الأرشيفات المحمية بحقوق نشر (مثل iReturn التابع لمنظمة Zochrot). نوفّر بدلًا من ذلك روابط خارجية للبحث الأعمق.',
                  "This page's historical text is written independently from public-domain sources, and does not reproduce copyrighted archive write-ups (such as Zochrot's iReturn). We link out to them for deeper research instead.",
                )}
              </p>
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="rounded-3xl border border-[var(--jt-olive-200)]/60 bg-[var(--jt-olive-50)]/40 p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p
                className="text-2xl font-bold text-[var(--jt-olive-900)]"
                style={{ fontFamily: 'var(--jt-font-display)' }}
              >
                {t('هل جذورك من هنا؟', 'Are your roots from here?')}
              </p>
              <p className="mt-1 text-sm text-[var(--jt-stone-700)]">
                {t(
                  'اربط شجرتك بهذا المكان واجعل الذاكرة أوسع.',
                  'Link your tree to this place — make the memory wider.',
                )}
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                href={`/tree`}
                className="inline-flex items-center gap-2 rounded-full bg-[var(--jt-olive-600)] px-5 py-2.5 text-sm font-semibold text-[var(--jt-stone-50)] shadow-[var(--jt-shadow-sm)] transition-colors hover:bg-[var(--jt-olive-700)]"
              >
                <Plus className="h-4 w-4" />
                {t('اربط فردًا', 'Link a person')}
              </Link>
              <Link
                href={`/search?placeId=${place.id}`}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--jt-olive-300)]/70 bg-[var(--card)] px-5 py-2.5 text-sm font-semibold text-[var(--jt-olive-800)] transition-colors hover:bg-[var(--jt-olive-100)]"
              >
                <TreePine className="h-4 w-4" />
                {t('ابحث في هذا المكان', 'Search in this place')}
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({
  color,
  label,
  value,
}: {
  color: 'olive' | 'gold' | 'terra';
  label: string;
  value: number;
}) {
  const fg =
    color === 'olive'
      ? 'var(--jt-olive-700)'
      : color === 'gold'
        ? 'var(--jt-gold-600)'
        : 'var(--jt-terra-600)';
  return (
    <div className="rounded-2xl border border-[var(--jt-stone-200)] bg-[var(--card)] p-5 shadow-[var(--jt-shadow-sm)]">
      <p
        className="text-4xl font-bold leading-none"
        style={{ fontFamily: 'var(--jt-font-display)', color: fg }}
      >
        {value.toLocaleString()}
      </p>
      <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--jt-stone-500)]">
        {label}
      </p>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  title,
  body,
  source,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  body: string;
  source?: string | null;
}) {
  const { locale } = useLocale();
  return (
    <div className="rounded-2xl border border-[var(--jt-stone-200)] bg-[var(--card)] p-5 shadow-[var(--jt-shadow-sm)] md:p-6">
      <h3
        className="mb-2 flex items-center gap-2 text-base font-bold text-[var(--jt-olive-900)]"
        style={{ fontFamily: 'var(--jt-font-display)' }}
      >
        <Icon className="h-4 w-4 text-[var(--jt-olive-600)]" />
        {title}
      </h3>
      <p
        className="text-[15px] text-[var(--jt-stone-800)]"
        style={{ lineHeight: locale === 'ar' ? 1.95 : 1.7 }}
      >
        {body}
      </p>
      {source && (
        <p className="mt-3 flex items-start gap-1.5 border-t border-[var(--jt-stone-200)]/60 pt-3 text-[11px] text-[var(--jt-stone-500)]">
          <FileText className="mt-0.5 h-3 w-3 flex-none" />
          <span>{source}</span>
        </p>
      )}
    </div>
  );
}

function EmptyHint({ ar, en }: { ar: string; en: string }) {
  const { t } = useLocale();
  return (
    <div className="rounded-2xl border border-dashed border-[var(--jt-olive-300)]/60 bg-[var(--jt-olive-50)]/40 p-6 text-center text-sm text-[var(--jt-stone-700)]">
      {t(ar, en)}
    </div>
  );
}
