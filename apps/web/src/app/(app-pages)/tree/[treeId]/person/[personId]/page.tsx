import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { T } from '@/components/ui/Typography';
import { AddChildForm } from '@/components/tree/AddChildForm';
import { TreeView360 } from '@/components/tree/TreeView360';
import { UpgradePlaceholderDialog } from '@/components/tree/UpgradePlaceholderDialog';
import { EvidencePanel } from '@/components/person/EvidencePanel';
import { PersonAvatar } from '@/components/person/PersonAvatar';
import { getPerson, getTreePersons } from '@/data/anon/persons';
import { getTreeSnapshot } from '@/data/anon/treeSnapshot';
import { getPrimaryPhotoUrl } from '@/data/user/attachments';
import { buildNeighbors } from '@/lib/tree/relationships';
import { createJuthoorSupabaseClient } from '@/supabase-clients/juthoor-server';

interface Props {
  readonly params: Promise<{
    readonly treeId: string;
    readonly personId: string;
  }>;
}

/**
 * Determine whether the current viewer can upload / delete attachments on this
 * person — i.e. they are the tree owner or an approved collaborator (not read-only).
 * Read-only members can VIEW evidence but not modify it.
 */
async function viewerCanManage(treeId: string): Promise<boolean> {
  const supabase = await createJuthoorSupabaseClient();
  const { data: authData } = await supabase.auth.getUser();
  const uid = authData.user?.id;
  if (!uid) return false;

  const { data: tree } = await supabase
    .from('trees')
    .select('owner_id')
    .eq('id', treeId)
    .maybeSingle();
  if ((tree as { owner_id: string } | null)?.owner_id === uid) return true;

  const { data: member } = await supabase
    .from('tree_members')
    .select('role, status')
    .eq('tree_id', treeId)
    .eq('user_id', uid)
    .maybeSingle();
  const m = member as { role: string; status: string } | null;
  return m?.status === 'approved' && (m.role === 'owner' || m.role === 'collaborator');
}

export default async function PersonPage({ params }: Props) {
  const { treeId, personId } = await params;

  const person = await getPerson(personId);
  if (!person) notFound();

  const [snapshot, allPersons, primaryPhotoUrl, canManage] = await Promise.all([
    getTreeSnapshot(treeId),
    getTreePersons(treeId),
    getPrimaryPhotoUrl(personId),
    viewerCanManage(treeId),
  ]);
  const neighbors = buildNeighbors(snapshot, personId);

  // primaryPhotoId is on persons row (added by attachments migration)
  const primaryPhotoId = (person as { primary_photo_id?: string | null }).primary_photo_id ?? null;
  const displayName = person.display_name_ar ?? person.display_name_en ?? '—';

  return (
    <div dir="rtl" className="flex flex-1 flex-col gap-6 p-4 md:p-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <PersonAvatar name={displayName} photoUrl={primaryPhotoUrl} size={72} />
          <div className="space-y-1">
            <T.H1>{displayName}</T.H1>
            {person.display_name_en && person.display_name_ar ? (
              <T.P className="text-muted-foreground">{person.display_name_en}</T.P>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {person.notes === 'placeholder' ? (
            <UpgradePlaceholderDialog
              treeId={treeId}
              placeholder={person}
              allPersons={allPersons}
            />
          ) : null}
          <Link href={`/tree/${treeId}`}>
            <Button variant="outline">عرض الشجرة</Button>
          </Link>
          <Link href={`/tree/${treeId}/add-person`}>
            <Button>إضافة شخص</Button>
          </Link>
        </div>
      </header>

      {/* Side-by-side on desktop: 360° tree on the start, evidence on the end.
          Stacks vertically below md so mobile keeps the wheel front-and-centre. */}
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <div className="min-w-0">
          <TreeView360 treeId={treeId} neighbors={neighbors} />
        </div>
        <div className="min-w-0">
          <EvidencePanel
            treeId={treeId}
            personId={personId}
            initialPrimaryPhotoId={primaryPhotoId}
            canManage={canManage}
          />
        </div>
      </div>

      {person.gender === 'M' ? (
        <Card>
          <CardHeader>
            <T.H3>إضافة ابن/ابنة</T.H3>
          </CardHeader>
          <CardContent>
            <AddChildForm
              treeId={treeId}
              fatherId={personId}
              persons={allPersons}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
