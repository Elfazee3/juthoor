'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { ChevronLeft, Crosshair, Search, UserSearch } from 'lucide-react';

import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import type { PersonView } from '@/lib/tree/types';

interface Props {
  readonly treeId: string;
  readonly persons: readonly PersonView[];
  readonly rootPersonId: string;
}

const MAX_RESULTS = 12;

/**
 * "Find in tree" — Ancestry-parity search sidebar for the chart.
 *
 * Search runs client-side over the already-loaded snapshot (no server
 * round-trip): type a name → click a result → the chart re-roots and
 * selects that person. Quick rows surface the current focus person, and
 * the footer links to the full "list of all people" table.
 */
export function FindInTreePanel({ treeId, persons, rootPersonId }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const root = persons.find((p) => p.id === rootPersonId) ?? null;

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return [] as readonly PersonView[];
    return persons
      .filter((p) => {
        const ar = p.displayNameAr?.toLowerCase() ?? '';
        const en = p.displayNameEn?.toLowerCase() ?? '';
        return ar.includes(needle) || en.includes(needle);
      })
      .slice(0, MAX_RESULTS);
  }, [q, persons]);

  function jumpTo(personId: string) {
    setOpen(false);
    setQ('');
    router.push(`/tree/${treeId}?root=${personId}&selected=${personId}`, {
      scroll: false,
    });
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-full border border-[var(--jt-stone-200)] bg-[var(--card)]/95 px-3 py-1.5 text-xs font-semibold text-[var(--jt-stone-600)] shadow-[var(--jt-shadow-md)] backdrop-blur-sm transition-colors hover:border-[var(--jt-olive-400)] hover:text-[var(--jt-olive-800)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--jt-gold-400)]"
        >
          <UserSearch className="h-3.5 w-3.5" />
          ابحث في الشجرة
        </button>
      </SheetTrigger>
      <SheetContent side="right" dir="rtl" className="flex w-full flex-col sm:max-w-sm">
        <SheetHeader>
          <SheetTitle
            className="text-right"
            style={{ fontFamily: 'var(--jt-font-display)' }}
          >
            ابحث في الشجرة
          </SheetTitle>
          <SheetDescription className="text-right">
            اكتب اسمًا للانتقال إليه مباشرة في المخطط.
          </SheetDescription>
        </SheetHeader>

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--jt-stone-400)]" />
          <Input
            autoFocus
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="الاسم…"
            className="ps-9"
            dir="rtl"
          />
        </div>

        <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
          {q.trim() === '' ? (
            <>
              {root ? (
                <section className="mb-3">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--jt-olive-700)]">
                    محور الشجرة الحالي
                  </p>
                  <ResultRow
                    person={root}
                    onClick={() => jumpTo(root.id)}
                    icon={<Crosshair className="h-3.5 w-3.5 text-[var(--jt-gold-600)]" />}
                  />
                </section>
              ) : null}
              <p className="px-1 text-xs leading-relaxed text-[var(--jt-stone-500)]">
                ابدأ بالكتابة — تبحث القائمة في {persons.length}{' '}
                {persons.length === 1 ? 'شخص' : 'شخصًا'} داخل هذه الشجرة.
              </p>
            </>
          ) : results.length === 0 ? (
            <p className="px-1 text-sm text-[var(--jt-stone-500)]">
              لا نتائج لـ «{q.trim()}».
            </p>
          ) : (
            <ul className="space-y-1">
              {results.map((p) => (
                <li key={p.id}>
                  <ResultRow person={p} onClick={() => jumpTo(p.id)} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <Link
          href={`/tree/${treeId}/people`}
          className="mt-3 flex items-center justify-between rounded-2xl border border-[var(--jt-stone-200)] px-4 py-3 text-sm font-semibold text-[var(--jt-olive-800)] transition-colors hover:border-[var(--jt-olive-400)] hover:bg-[var(--jt-olive-50)]"
        >
          قائمة كل الأشخاص
          <ChevronLeft className="h-4 w-4 opacity-60" />
        </Link>
      </SheetContent>
    </Sheet>
  );
}

function ResultRow({
  person,
  onClick,
  icon,
}: {
  readonly person: PersonView;
  readonly onClick: () => void;
  readonly icon?: React.ReactNode;
}) {
  const label = person.displayNameAr ?? person.displayNameEn ?? '—';
  const initial = label !== '—' ? label.trim().slice(0, 1) : '؟';
  const isFemale = person.gender === 'F';
  const years =
    person.birthYear || person.deathYear
      ? `${person.birthYear ?? '؟'}${person.deathYear ? ` – ${person.deathYear}` : ''}`
      : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-start transition-colors hover:bg-[var(--jt-olive-50)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--jt-gold-400)]"
    >
      <span
        className={cn(
          'flex h-9 w-9 flex-none items-center justify-center rounded-full text-sm font-bold',
          person.isPlaceholder
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
      <span className="min-w-0 flex-1">
        <span
          className="block truncate text-sm font-bold text-[var(--jt-stone-800)]"
          dir={person.displayNameAr ? 'rtl' : 'ltr'}
          style={{ fontFamily: 'var(--jt-font-display)' }}
        >
          {label}
        </span>
        {years ? (
          <span dir="ltr" className="block text-[11px] tabular-nums text-[var(--jt-stone-500)]">
            {years}
          </span>
        ) : null}
      </span>
      {icon}
    </button>
  );
}
