import { notFound } from 'next/navigation';
import { Suspense } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { T } from '@/components/ui/Typography';
import { getTreeById } from '@/data/anon/trees';
import { getTreePersons } from '@/data/anon/persons';
import { getTreeSnapshot } from '@/data/anon/treeSnapshot';

import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { ExportGedcomButton } from '@/components/tree/ExportGedcomButton';
import { ImportGedcomDialog } from '@/components/tree/ImportGedcomDialog';
import { TreeWorkspace } from '@/components/tree/TreeWorkspace';
import { Plus, Users } from 'lucide-react';

interface Props {
  readonly params: Promise<{ readonly treeId: string }>;
  readonly searchParams: Promise<{
    readonly root?: string;
    readonly selected?: string;
  }>;
}

/**
 * Tree landing — now shows the actual family chart by default. When the
 * tree is empty, a friendly "add your first person" CTA replaces the chart.
 * Replaces the previous redirect-to-add-self pattern, which was opaque
 * and hid the chart from users who landed via a shared link.
 *
 * `?root=<personId>` URL param re-roots the chart at that person — used by
 * the per-card "View tree" context-menu action and Family Search results
 * that want to land on the oldest known ancestor.
 */
export default async function TreePage({ params, searchParams }: Props) {
  const { treeId } = await params;
  const { root: rootParam } = await searchParams;

  const tree = await getTreeById(treeId);
  if (!tree) notFound();

  return (
    <div dir="rtl" className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <T.H1>{tree.name}</T.H1>
          <T.P className="text-muted-foreground">
            {tree.description ?? 'شجرتك العائلية — أضف نفسك أولاً، ثم الوالدين والأقارب.'}
          </T.P>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link href={`/tree/${treeId}/add-person`}>
            <Button className="gap-1.5">
              <Plus className="h-4 w-4" />
              إضافة شخص
            </Button>
          </Link>
          <Link href={`/tree/${treeId}/people`}>
            <Button variant="outline" className="gap-1.5">
              <Users className="h-4 w-4" />
              كل الأشخاص
            </Button>
          </Link>
          <ImportGedcomDialog treeId={treeId} />
          <ExportGedcomButton treeId={treeId} />
        </div>
      </header>

      <Suspense fallback={<TreeLoadingSkeleton />}>
        <TreeChartOrEmpty treeId={treeId} requestedRoot={rootParam} />
      </Suspense>
    </div>
  );
}

async function TreeChartOrEmpty({
  treeId,
  requestedRoot,
}: {
  readonly treeId: string;
  readonly requestedRoot?: string;
}) {
  const [snapshot, persons] = await Promise.all([
    getTreeSnapshot(treeId),
    getTreePersons(treeId),
  ]);

  if (persons.length === 0) {
    return <EmptyTreeBanner treeId={treeId} />;
  }

  // Honor ?root=<personId> if it's present AND points to someone in this
  // tree; otherwise fall back to the first person. Avoids 500s when the
  // URL carries a stale id from a deleted person.
  const rootPersonId =
    requestedRoot && persons.some((p) => p.id === requestedRoot)
      ? requestedRoot
      : persons[0].id;

  return (
    <TreeWorkspace
      treeId={treeId}
      snapshot={snapshot}
      rootPersonId={rootPersonId}
      persons={persons}
    />
  );
}

function EmptyTreeBanner({ treeId }: { readonly treeId: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 rounded-3xl border-2 border-dashed border-[var(--jt-olive-300)]/60 bg-[var(--jt-olive-50)]/30 p-12 text-center md:p-20">
      <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--jt-olive-600)] text-[var(--jt-stone-50)]">
        <Users className="h-7 w-7" />
      </div>
      <div className="space-y-2">
        <h2
          className="text-3xl font-bold text-[var(--jt-olive-900)] md:text-4xl"
          style={{ fontFamily: 'var(--jt-font-display)' }}
        >
          لا تزال شجرتك فارغة
        </h2>
        <p className="mx-auto max-w-md text-[var(--jt-stone-700)]" style={{ lineHeight: 1.9 }}>
          ابدأ بإضافة نفسك أو فردًا تعرفه من العائلة. ستنمو الشجرة معك خطوة بخطوة.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Link href={`/tree/${treeId}/add-self`}>
          <Button size="lg" className="gap-2">
            <Plus className="h-4 w-4" />
            أضف نفسك
          </Button>
        </Link>
        <Link href={`/tree/${treeId}/add-person`}>
          <Button size="lg" variant="outline" className="gap-2">
            <Plus className="h-4 w-4" />
            أضف فردًا آخر
          </Button>
        </Link>
      </div>
    </div>
  );
}

function TreeLoadingSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-[480px] w-full rounded-3xl" />
    </div>
  );
}
