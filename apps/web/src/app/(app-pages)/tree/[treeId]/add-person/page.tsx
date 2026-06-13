import { notFound } from 'next/navigation';

import { getTreeById } from '@/data/anon/trees';
import { getTreeFamilies } from '@/data/anon/families';
import { getTreePersons } from '@/data/anon/persons';
import { AddPersonForm } from '@/components/tree/AddPersonForm';

interface Props {
  readonly params: Promise<{ readonly treeId: string }>;
  readonly searchParams: Promise<{
    readonly relativeTo?: string;
    readonly as?: string;
  }>;
}

export default async function AddPersonPage({ params, searchParams }: Props) {
  const { treeId } = await params;
  const { relativeTo, as: asKind } = await searchParams;
  const tree = await getTreeById(treeId);
  if (!tree) notFound();
  const [persons, familyRows] = await Promise.all([
    getTreePersons(treeId).catch(() => []),
    getTreeFamilies(treeId).catch(() => []),
  ]);
  const families = familyRows.map((f) => ({
    id: f.id,
    partner1Id: f.partner1_id,
    partner2Id: f.partner2_id,
  }));

  return (
    <div dir="rtl" className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-8">
      <header>
        <p className="mb-2 inline-flex items-center gap-2 rounded-full border border-[var(--jt-olive-200)]/70 bg-[var(--jt-olive-50)]/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--jt-olive-700)]">
          إضافة جديدة
        </p>
        <h1
          className="text-3xl font-bold text-[var(--jt-olive-900)] md:text-4xl"
          style={{ fontFamily: 'var(--jt-font-display)' }}
        >
          إضافة شخص إلى شجرتك
        </h1>
        <p className="mt-1 text-sm text-[var(--jt-stone-600)]">
          اختر صلة القرابة أولاً، ثم املأ بياناته. ستظهر معاينة واضحة قبل الحفظ.
        </p>
      </header>

      <AddPersonForm
        treeId={treeId}
        mode="general"
        persons={persons}
        families={families}
        initialAnchorPersonId={relativeTo ?? null}
        initialRelationshipKind={parseRelationshipKind(asKind)}
      />
    </div>
  );
}

function parseRelationshipKind(
  raw: string | undefined,
):
  | 'child'
  | 'parent'
  | 'spouse'
  | 'sibling'
  | 'self'
  | 'unrelated'
  | undefined {
  if (!raw) return undefined;
  const lower = raw.toLowerCase();
  if (
    lower === 'child' ||
    lower === 'parent' ||
    lower === 'spouse' ||
    lower === 'sibling' ||
    lower === 'self' ||
    lower === 'unrelated'
  ) {
    return lower;
  }
  return undefined;
}
