'use server';

import { z } from 'zod';
import { createJuthoorSupabaseClient } from '@/supabase-clients/juthoor-server';
import { getCachedLoggedInUserIdOrNull } from '@/rsc-data/supabase';

export type IdentifierKind = 'unrwa_card' | 'family_card_1948';

export type PersonIdentifiers = {
  unrwaCard: string | null;
  familyCard1948: string | null;
  /** A copy of the UNRWA card is on file (attachment tag `unrwa_card`). Required for the number to match. */
  hasUnrwaCardCopy: boolean;
  /**
   * Where the UNRWA number stands: a Platform Administrator must check it against the card copy
   * before it can link anyone. `none` = no number saved.
   */
  unrwaStatus: UnrwaStatus;
};

export type UnrwaStatus = 'none' | 'needs_copy' | 'awaiting_check' | 'verified' | 'rejected';

const KindSchema = z.enum(['unrwa_card', 'family_card_1948']);
const SaveSchema = z.object({
  personId: z.string().uuid(),
  kind: KindSchema,
  value: z.string().trim().min(3).max(40),
});
const RemoveSchema = z.object({ personId: z.string().uuid(), kind: KindSchema });

/**
 * The perfect-match identifiers of a person (decision D8). Row-level security limits
 * them to people who can write the person's tree, so everyone else gets empty values.
 */
export async function getPersonIdentifiers(personId: string): Promise<PersonIdentifiers> {
  const supabase = await createJuthoorSupabaseClient();
  const [{ data: rows }, { count }] = await Promise.all([
    supabase
      .from('person_identifiers')
      .select('kind, value, verified_at, rejected_at')
      .eq('person_id', personId),
    supabase
      .from('person_attachments')
      .select('id', { count: 'exact', head: true })
      .eq('person_id', personId)
      .eq('tag', 'unrwa_card'),
  ]);
  const byKind = new Map((rows ?? []).map((r) => [r.kind, r]));
  const unrwa = byKind.get('unrwa_card');
  const hasCopy = (count ?? 0) > 0;
  let unrwaStatus: UnrwaStatus = 'none';
  if (unrwa) {
    if (unrwa.verified_at) unrwaStatus = 'verified';
    else if (!hasCopy) unrwaStatus = 'needs_copy';
    else if (unrwa.rejected_at) unrwaStatus = 'rejected';
    else unrwaStatus = 'awaiting_check';
  }
  return {
    unrwaCard: unrwa?.value ?? null,
    familyCard1948: byKind.get('family_card_1948')?.value ?? null,
    hasUnrwaCardCopy: hasCopy,
    unrwaStatus,
  };
}

export async function savePersonIdentifier(input: z.input<typeof SaveSchema>): Promise<void> {
  const parsed = SaveSchema.parse(input);
  const uid = await getCachedLoggedInUserIdOrNull();
  if (!uid) throw new Error('Not authenticated');
  const supabase = await createJuthoorSupabaseClient();
  const { error } = await supabase.from('person_identifiers').upsert(
    {
      person_id: parsed.personId,
      kind: parsed.kind,
      value: parsed.value,
      created_by: uid,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'person_id,kind' },
  );
  if (error) throw new Error(error.message);
}

export async function removePersonIdentifier(input: z.input<typeof RemoveSchema>): Promise<void> {
  const parsed = RemoveSchema.parse(input);
  const uid = await getCachedLoggedInUserIdOrNull();
  if (!uid) throw new Error('Not authenticated');
  const supabase = await createJuthoorSupabaseClient();
  const { error } = await supabase
    .from('person_identifiers')
    .delete()
    .eq('person_id', parsed.personId)
    .eq('kind', parsed.kind);
  if (error) throw new Error(error.message);
}
