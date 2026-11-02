'use server';

import { z } from 'zod';
import { createJuthoorSupabaseClient } from '@/supabase-clients/juthoor-server';
import { getCachedLoggedInUserIdOrNull } from '@/rsc-data/supabase';

/**
 * Owner of the record (decision D1): the registered account a person record describes. For a
 * living person, only the owner, the tree's IFT Administrator, and anyone the owner permits can
 * read or edit the non-mandatory information; the database enforces it.
 */
export type RecordOwnership = {
  /** The person is living (decision D2): only then does ownership matter. */
  isLiving: boolean;
  /** An account is linked to this person. */
  isClaimed: boolean;
  /** The signed-in user is that account. */
  viewerIsOwner: boolean;
  /** The tree's IFT Administrator, who can be given permission to edit. */
  treeOwnerId: string | null;
  /** The owner has given the IFT Administrator permission to edit (only the owner can see this). */
  adminCanEdit: boolean;
};

const PersonSchema = z.object({ personId: z.string().uuid() });
const ToggleSchema = z.object({ personId: z.string().uuid(), allow: z.boolean() });

export async function getRecordOwnership(personId: string): Promise<RecordOwnership | null> {
  const uid = await getCachedLoggedInUserIdOrNull();
  if (!uid) return null;
  const supabase = await createJuthoorSupabaseClient();

  const { data: person } = await supabase
    .from('persons')
    .select('tree_id, owner_user_id')
    .eq('id', personId)
    .maybeSingle();
  if (!person) return null;

  const [{ data: living }, { data: tree }] = await Promise.all([
    supabase.rpc('is_person_living', { p_person_id: personId }),
    supabase.from('trees').select('owner_id').eq('id', person.tree_id).maybeSingle(),
  ]);
  const treeOwnerId = tree?.owner_id ?? null;
  const viewerIsOwner = person.owner_user_id === uid;

  let adminCanEdit = false;
  if (viewerIsOwner && treeOwnerId) {
    const { data: grant } = await supabase
      .from('person_access_grants')
      .select('person_id')
      .eq('person_id', personId)
      .eq('grantee_user_id', treeOwnerId)
      .maybeSingle();
    adminCanEdit = Boolean(grant);
  }

  return {
    isLiving: Boolean(living),
    isClaimed: person.owner_user_id !== null,
    viewerIsOwner,
    treeOwnerId,
    adminCanEdit,
  };
}

/** "This is me": link the signed-in account to a living person (D10: no further check). */
export async function claimPerson(input: z.input<typeof PersonSchema>): Promise<void> {
  const { personId } = PersonSchema.parse(input);
  const supabase = await createJuthoorSupabaseClient();
  const { error } = await supabase.rpc('claim_person', { p_person: personId });
  if (error) throw new Error(friendly(error.message));
}

/** The owner lets go of the record: the IFT Administrator takes over again. */
export async function releasePerson(input: z.input<typeof PersonSchema>): Promise<void> {
  const { personId } = PersonSchema.parse(input);
  const supabase = await createJuthoorSupabaseClient();
  const { error } = await supabase.rpc('release_person', { p_person: personId });
  if (error) throw new Error(friendly(error.message));
}

/** The owner allows, or stops allowing, the IFT Administrator to edit the non-mandatory information. */
export async function setAdminCanEdit(input: z.input<typeof ToggleSchema>): Promise<void> {
  const { personId, allow } = ToggleSchema.parse(input);
  const supabase = await createJuthoorSupabaseClient();
  const { data: person } = await supabase
    .from('persons')
    .select('tree_id')
    .eq('id', personId)
    .maybeSingle();
  if (!person) throw new Error('Person not found');
  const { data: tree } = await supabase
    .from('trees')
    .select('owner_id')
    .eq('id', person.tree_id)
    .maybeSingle();
  if (!tree) throw new Error('Tree not found');
  const { error } = allow
    ? await supabase.rpc('grant_person_access', { p_person: personId, p_grantee: tree.owner_id })
    : await supabase.rpc('revoke_person_access', { p_person: personId, p_grantee: tree.owner_id });
  if (error) throw new Error(friendly(error.message));
}

function friendly(message: string): string {
  if (message.includes('already_claimed')) return 'This record is already linked to an account.';
  if (message.includes('account_already_linked')) return 'Your account is already linked to a person.';
  if (message.includes('person_not_living')) return 'Only a living person can be linked to an account.';
  if (message.includes('not_authorized')) return 'You cannot do that for this person.';
  if (message.includes('grantee_is_owner')) return 'You already control this record.';
  return message;
}
