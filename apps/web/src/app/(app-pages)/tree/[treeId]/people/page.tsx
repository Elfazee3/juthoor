import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  MapPin,
  Network,
  Search,
  User,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getTreeById } from '@/data/anon/trees';
import {
  getTreePeoplePage,
  type PersonListRow,
  type PersonListStatusFilter,
} from '@/data/anon/personsList';
import { cn } from '@/lib/utils';

interface Props {
  readonly params: Promise<{ readonly treeId: string }>;
  readonly searchParams: Promise<{
    readonly q?: string;
    readonly gender?: string;
    readonly status?: string;
    readonly page?: string;
  }>;
}

/**
 * "List of all people" — Ancestry-parity table view of the whole tree.
 *
 * Journey: search or filter → find the person → jump straight into the
 * chart centred on them (the row's main action), or open their profile.
 * Server-rendered with GET params so the URL is shareable and the
 * back-button works mid-search.
 */
export default async function PeopleListPage({ params, searchParams }: Props) {
  const { treeId } = await params;
  const sp = await searchParams;

  const tree = await getTreeById(treeId);
  if (!tree) notFound();

  const gender = sp.gender === 'M' || sp.gender === 'F' ? sp.gender : undefined;
  const status: PersonListStatusFilter =
    sp.status === 'living' ||
    sp.status === 'deceased' ||
    sp.status === 'placeholder'
      ? sp.status
      : 'all';
  const page = Math.max(1, Number(sp.page) || 1);
  const q = sp.q?.trim() || undefined;

  const result = await getTreePeoplePage({
    treeId,
    q,
    gender,
    status: status === 'all' ? undefined : status,
    page,
  });

  const totalPages = Math.max(1, Math.ceil(result.total / result.pageSize));
  const fromN = result.total === 0 ? 0 : (result.page - 1) * result.pageSize + 1;
  const toN = Math.min(result.total, result.page * result.pageSize);

  /** Rebuild the query string, overriding select params. */
  const buildHref = (overrides: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    const merged: Record<string, string | undefined> = {
      q,
      gender,
      status: status === 'all' ? undefined : status,
      page: undefined, // filters reset pagination unless explicitly set
      ...overrides,
    };
    for (const [key, value] of Object.entries(merged)) {
      if (value) next.set(key, value);
    }
    const qs = next.toString();
    return `/tree/${treeId}/people${qs ? `?${qs}` : ''}`;
  };

  return (
    <div dir="rtl" className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 p-4 md:p-6">
      {/* ── Header ── */}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <nav className="text-xs text-[var(--jt-stone-500)]">
            <Link href={`/tree/${treeId}`} className="hover:text-[var(--jt-olive-700)] hover:underline">
              {tree.name}
            </Link>
            <span className="mx-1.5">‹</span>
            <span>قائمة كل الأشخاص</span>
          </nav>
          <h1
            className="text-3xl font-bold text-[var(--jt-olive-900)] md:text-4xl"
            style={{ fontFamily: 'var(--jt-font-display)' }}
          >
            كل الأشخاص في الشجرة
          </h1>
        </div>
        <Link href={`/tree/${treeId}`}>
          <Button variant="outline" className="gap-1.5">
            <Network className="h-4 w-4" />
            عرض الشجرة
          </Button>
        </Link>
      </header>

      {/* ── Search + filters ── */}
      <section className="rounded-3xl border border-[var(--jt-stone-200)] bg-[var(--card)] p-4 shadow-[var(--jt-shadow-sm)] md:p-5">
        <form method="GET" className="flex flex-wrap items-center gap-3">
          {status !== 'all' ? (
            <input type="hidden" name="status" value={status} />
          ) : null}
          {gender ? <input type="hidden" name="gender" value={gender} /> : null}
          <div className="relative min-w-0 flex-1 basis-64">
            <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--jt-stone-400)]" />
            <Input
              type="search"
              name="q"
              defaultValue={q ?? ''}
              placeholder="ابحث بالاسم (عربي أو إنجليزي)…"
              className="ps-9"
              dir="rtl"
            />
          </div>
          <Button type="submit" variant="secondary">
            بحث
          </Button>
        </form>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <FilterChip href={buildHref({ gender: undefined, status: undefined })} active={!gender && status === 'all'}>
            الكل
          </FilterChip>
          <FilterChip href={buildHref({ gender: 'M' })} active={gender === 'M'}>
            ذكور
          </FilterChip>
          <FilterChip href={buildHref({ gender: 'F' })} active={gender === 'F'}>
            إناث
          </FilterChip>
          <span className="mx-1 h-4 w-px bg-[var(--jt-stone-200)]" aria-hidden />
          <FilterChip href={buildHref({ status: 'living' })} active={status === 'living'}>
            أحياء
          </FilterChip>
          <FilterChip href={buildHref({ status: 'deceased' })} active={status === 'deceased'}>
            متوفّون
          </FilterChip>
          <FilterChip href={buildHref({ status: 'placeholder' })} active={status === 'placeholder'}>
            مؤقتون
          </FilterChip>
        </div>
      </section>

      {/* ── Table ── */}
      <section className="overflow-hidden rounded-3xl border border-[var(--jt-stone-200)] bg-[var(--card)] shadow-[var(--jt-shadow-sm)]">
        <div className="flex items-center justify-between border-b border-[var(--jt-stone-200)]/70 px-4 py-3 md:px-5">
          <p className="text-sm font-semibold text-[var(--jt-stone-700)]">
            {result.total === 0
              ? 'لا نتائج'
              : `${fromN}–${toN} من ${result.total} ${result.total === 1 ? 'شخص' : 'شخص'}`}
          </p>
          {q ? (
            <Link
              href={buildHref({ q: undefined })}
              className="text-xs text-[var(--jt-olive-700)] hover:underline"
            >
              مسح البحث ×
            </Link>
          ) : null}
        </div>

        {result.rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-[var(--jt-stone-500)]">
            لا يوجد أشخاص مطابقون — جرّب بحثًا أو فلترًا مختلفًا.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--jt-stone-200)]/70 text-start text-[11px] font-semibold uppercase tracking-wider text-[var(--jt-stone-500)]">
                <th className="px-4 py-2.5 text-start md:px-5">الاسم</th>
                <th className="px-3 py-2.5 text-start">الميلاد</th>
                <th className="hidden px-3 py-2.5 text-start sm:table-cell">الوفاة</th>
                <th className="px-3 py-2.5 text-start sr-only">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row) => (
                <PersonRow key={row.id} row={row} treeId={treeId} />
              ))}
            </tbody>
          </table>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 ? (
          <div className="flex items-center justify-between border-t border-[var(--jt-stone-200)]/70 px-4 py-3 md:px-5">
            <PageLink
              href={buildHref({ page: String(result.page - 1) })}
              disabled={result.page <= 1}
            >
              <ChevronRight className="h-4 w-4" />
              السابق
            </PageLink>
            <span className="text-xs text-[var(--jt-stone-500)]">
              صفحة {result.page} من {totalPages}
            </span>
            <PageLink
              href={buildHref({ page: String(result.page + 1) })}
              disabled={result.page >= totalPages}
            >
              التالي
              <ChevronLeft className="h-4 w-4" />
            </PageLink>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function PersonRow({
  row,
  treeId,
}: {
  readonly row: PersonListRow;
  readonly treeId: string;
}) {
  const label = row.displayNameAr ?? row.displayNameEn ?? '—';
  const initial = label !== '—' ? label.trim().slice(0, 1) : '؟';
  const isFemale = row.gender === 'F';
  const jumpHref = `/tree/${treeId}?root=${row.id}&selected=${row.id}`;
  const profileHref = `/tree/${treeId}/person/${row.id}`;

  return (
    <tr className="group border-b border-[var(--jt-stone-200)]/50 transition-colors last:border-b-0 hover:bg-[var(--jt-olive-50)]/50">
      {/* Name — main click target jumps into the chart (Ancestry parity) */}
      <td className="px-4 py-2.5 md:px-5">
        <Link href={jumpHref} className="flex min-w-0 items-center gap-3">
          <span
            className={cn(
              'flex h-9 w-9 flex-none items-center justify-center rounded-full text-sm font-bold',
              row.isPlaceholder
                ? 'border-2 border-dashed border-[var(--jt-gold-400)]/70 bg-[var(--jt-gold-100)]/60 text-[var(--jt-gold-600)]'
                : isFemale
                  ? 'bg-gradient-to-br from-[var(--jt-terra-100)] to-[var(--jt-terra-200)] text-[var(--jt-terra-700)]'
                  : 'bg-gradient-to-br from-[var(--jt-olive-100)] to-[var(--jt-olive-200)] text-[var(--jt-olive-800)]',
            )}
            style={{ fontFamily: 'var(--jt-font-display)' }}
            aria-hidden
          >
            {initial}
          </span>
          <span className="min-w-0">
            <span
              className="block truncate font-bold text-[var(--jt-stone-800)] group-hover:text-[var(--jt-olive-900)]"
              dir={row.displayNameAr ? 'rtl' : 'ltr'}
              style={{ fontFamily: 'var(--jt-font-display)' }}
            >
              {label}
            </span>
            {row.displayNameAr && row.displayNameEn ? (
              <span className="block truncate text-[11px] text-[var(--jt-stone-500)]" dir="ltr">
                {row.displayNameEn}
              </span>
            ) : null}
            {row.isPlaceholder ? (
              <span className="mt-0.5 inline-flex w-fit items-center rounded-full bg-[var(--jt-gold-200)]/80 px-1.5 py-px text-[9px] font-bold tracking-wider text-[var(--jt-gold-800)]">
                مؤقت
              </span>
            ) : null}
          </span>
        </Link>
      </td>

      {/* Birth */}
      <td className="px-3 py-2.5 text-[var(--jt-stone-600)]">
        <div className="flex flex-col gap-0.5">
          <span dir="ltr" className="tabular-nums">
            {row.birthYear ?? '—'}
          </span>
          {row.birthPlaceAr ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-[var(--jt-stone-500)]">
              <MapPin className="h-3 w-3 flex-none opacity-70" />
              <span className="truncate">{row.birthPlaceAr}</span>
            </span>
          ) : null}
        </div>
      </td>

      {/* Death */}
      <td className="hidden px-3 py-2.5 text-[var(--jt-stone-600)] sm:table-cell">
        {row.deathYear ? (
          <span dir="ltr" className="tabular-nums">
            {row.deathYear}
          </span>
        ) : row.isLiving ? (
          <span className="text-[11px] text-[var(--jt-olive-700)]">على قيد الحياة</span>
        ) : (
          '—'
        )}
      </td>

      {/* Actions */}
      <td className="px-3 py-2.5">
        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
          <Link
            href={jumpHref}
            title="عرض في الشجرة"
            aria-label={`عرض ${label} في الشجرة`}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--jt-stone-500)] hover:bg-[var(--jt-olive-100)] hover:text-[var(--jt-olive-800)]"
          >
            <Network className="h-3.5 w-3.5" />
          </Link>
          <Link
            href={profileHref}
            title="الملف الشخصي"
            aria-label={`الملف الشخصي لـ ${label}`}
            className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--jt-stone-500)] hover:bg-[var(--jt-olive-100)] hover:text-[var(--jt-olive-800)]"
          >
            <User className="h-3.5 w-3.5" />
          </Link>
        </div>
      </td>
    </tr>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  readonly href: string;
  readonly active: boolean;
  readonly children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? 'true' : undefined}
      className={cn(
        'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
        active
          ? 'border-transparent bg-[var(--jt-olive-700)] text-[var(--jt-stone-50)]'
          : 'border-[var(--jt-stone-200)] bg-[var(--card)] text-[var(--jt-stone-600)] hover:border-[var(--jt-olive-400)] hover:text-[var(--jt-olive-800)]',
      )}
    >
      {children}
    </Link>
  );
}

function PageLink({
  href,
  disabled,
  children,
}: {
  readonly href: string;
  readonly disabled: boolean;
  readonly children: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span className="inline-flex cursor-not-allowed items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-[var(--jt-stone-300)]">
        {children}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold text-[var(--jt-olive-700)] transition-colors hover:bg-[var(--jt-olive-50)]"
    >
      {children}
    </Link>
  );
}
