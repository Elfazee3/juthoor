'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { PlusCircle, Search, Users, Sparkles, TreePine } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { T } from '@/components/ui/Typography';
import type { Person } from '@/types/database';

interface Props {
  readonly treeId: string;
  readonly persons: readonly Person[];
}

/**
 * Phase-1 landing view for a tree. Hero with live stats, search,
 * and a gender-coded person grid. Each card deep-links into the
 * 360° view at /tree/[id]/person/[pid].
 */
export function TreeLandingClient({ treeId, persons }: Props) {
  const [query, setQuery] = useState('');

  const stats = useMemo(() => {
    const males = persons.filter((p) => p.gender === 'M').length;
    const females = persons.filter((p) => p.gender === 'F').length;
    const placeholders = persons.filter(
      (p) => p.notes === 'placeholder',
    ).length;
    return {
      total: persons.length,
      males,
      females,
      placeholders,
    };
  }, [persons]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return persons;
    return persons.filter((p) => {
      const ar = (p.display_name_ar ?? '').toLowerCase();
      const en = (p.display_name_en ?? '').toLowerCase();
      return ar.includes(q) || en.includes(q);
    });
  }, [persons, query]);

  return (
    <div className="flex flex-col gap-8" dir="rtl">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border bg-gradient-to-bl from-primary/10 via-background to-background p-6 sm:p-8">
        <div className="pointer-events-none absolute -top-10 -left-10 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-amber-200/20 blur-3xl" />

        <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              <TreePine className="h-3.5 w-3.5 text-primary" />
              شجرة العائلة
            </div>
            <T.H2 className="!mt-0">جذور العائلة</T.H2>
            <p className="max-w-xl text-sm text-muted-foreground">
              أَضِف أشخاصًا، اربطهم بالزواج والأبوة، وشاهد شجرتك تنمو. اضغط على
              أيّ بطاقة لفتح العرض الدائري ٣٦٠°.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 md:flex-col md:items-stretch">
            <Link href={`/tree/${treeId}/add-person`}>
              <Button size="lg" className="gap-2">
                <PlusCircle className="h-4 w-4" /> إضافة شخص
              </Button>
            </Link>
            <Link href={`/tree/${treeId}/chart`}>
              <Button size="lg" variant="outline" className="gap-2">
                <Sparkles className="h-4 w-4" /> العرض البياني
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="relative mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatPill label="الإجمالي" value={stats.total} tone="primary" />
          <StatPill label="رجال" value={stats.males} tone="blue" />
          <StatPill label="نساء" value={stats.females} tone="rose" />
          <StatPill
            label="مؤقّت"
            value={stats.placeholders}
            tone="amber"
          />
        </div>
      </section>

      {/* Search + results */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <T.H3 className="!mt-0">الأشخاص</T.H3>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {filtered.length}
            </span>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              dir="rtl"
              placeholder="ابحث بالاسم…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pr-9"
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState hasPersons={persons.length > 0} treeId={treeId} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((p) => (
              <PersonCard key={p.id} person={p} treeId={treeId} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StatPill({
  label,
  value,
  tone,
}: {
  readonly label: string;
  readonly value: number;
  readonly tone: 'primary' | 'blue' | 'rose' | 'amber';
}) {
  const toneClasses: Record<typeof tone, string> = {
    primary: 'from-primary/15 to-primary/5 text-primary',
    blue: 'from-blue-500/15 to-blue-500/5 text-blue-600 dark:text-blue-400',
    rose: 'from-rose-500/15 to-rose-500/5 text-rose-600 dark:text-rose-400',
    amber:
      'from-amber-500/15 to-amber-500/5 text-amber-700 dark:text-amber-400',
  };
  return (
    <div
      className={`rounded-2xl border bg-gradient-to-bl ${toneClasses[tone]} px-4 py-3 backdrop-blur`}
    >
      <div className="text-[10px] uppercase tracking-wider opacity-80">
        {label}
      </div>
      <div className="mt-0.5 text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}

function PersonCard({
  person: p,
  treeId,
}: {
  readonly person: Person;
  readonly treeId: string;
}) {
  const isFemale = p.gender === 'F';
  const isPlaceholder = p.notes === 'placeholder';
  const initial = (p.display_name_ar ?? p.display_name_en ?? '?').trim()[0];

  return (
    <Link
      href={`/tree/${treeId}/person/${p.id}`}
      className="block rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/40"
      aria-label={p.display_name_ar ?? p.display_name_en ?? 'شخص'}
    >
      <Card
        className={`h-full overflow-hidden border transition hover:-translate-y-0.5 hover:shadow-lg ${
          isPlaceholder ? 'border-dashed' : ''
        }`}
      >
        <div
          className={`h-1 w-full ${
            isFemale
              ? 'bg-gradient-to-l from-rose-400 to-rose-200'
              : 'bg-gradient-to-l from-blue-500 to-blue-300'
          }`}
        />
        <CardContent className="flex items-center gap-3 p-4">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lg font-semibold ${
              isFemale
                ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300'
                : 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-300'
            }`}
          >
            {initial || '؟'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold">
              {p.display_name_ar ?? p.display_name_en ?? '—'}
            </div>
            {p.display_name_en && p.display_name_ar ? (
              <div
                className="truncate text-xs text-muted-foreground"
                dir="ltr"
              >
                {p.display_name_en}
              </div>
            ) : null}
            <div className="mt-1 text-[11px] text-muted-foreground">
              {isPlaceholder ? 'شخص مؤقت' : 'سجل عائلة'}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function EmptyState({
  hasPersons,
  treeId,
}: {
  readonly hasPersons: boolean;
  readonly treeId: string;
}) {
  if (hasPersons) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
          <Search className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            لا توجد نتائج مطابقة لبحثك.
          </p>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
        <div className="rounded-full bg-primary/10 p-3">
          <TreePine className="h-7 w-7 text-primary" />
        </div>
        <div className="space-y-1">
          <p className="font-semibold">ابدأ شجرتك</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            أضف نفسك أولًا، ثمّ اربط والديك وأجدادك لبناء جذور عائلتك.
          </p>
        </div>
        <Link href={`/tree/${treeId}/add-self`}>
          <Button className="mt-2 gap-2">
            <PlusCircle className="h-4 w-4" /> أضفني
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
