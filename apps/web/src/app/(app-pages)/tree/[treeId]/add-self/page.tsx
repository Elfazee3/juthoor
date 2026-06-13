import { notFound } from 'next/navigation';

import { T } from '@/components/ui/Typography';
import { getTreeById } from '@/data/anon/trees';
import { getTreePersons } from '@/data/anon/persons';
import { AddPersonForm } from '@/components/tree/AddPersonForm';

interface Props {
  readonly params: Promise<{ readonly treeId: string }>;
}

/**
 * Step 3 bootstrap: after auto-creating the tree, we route the user
 * here so the very first person they add is themselves. This anchors
 * the whole tree and gives the 360° view a centre to focus on.
 */
export default async function AddSelfPage({ params }: Props) {
  const { treeId } = await params;
  const tree = await getTreeById(treeId);
  if (!tree) notFound();
  const persons = await getTreePersons(treeId).catch(() => []);

  return (
    <div dir="rtl" className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 md:p-8">
      <header className="space-y-1">
        <T.H1>أضف نفسك</T.H1>
        <T.P className="text-muted-foreground">
          ابدأ بإدخال معلوماتك الأساسية. يمكنك إضافة الأقارب لاحقًا.
        </T.P>
      </header>

      <AddPersonForm treeId={treeId} mode="self" persons={persons} />
    </div>
  );
}
