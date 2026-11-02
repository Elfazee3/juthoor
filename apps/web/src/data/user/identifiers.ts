'use server';

import { z } from 'zod';
import { createJuthoorSupabaseClient } from '@/supabase-clients/juthoor-server';
import { getCachedLoggedInUserIdOrNull } from '@/rsc-data/supabase';

export type IdentifierKind = 'unrwa_card' | 'family_card_1948';

export type IdentifierStatus = 'none' | 'needs_copy' | 'awaiting_check' | 'verified' | 'rejected';

export type PersonIdentifiers = {
  unrwaCard: string | null;
  familyCard1948: string | null;
  /**
   * Where each number stands. A copy of the card must be attached (document tag `unrwa_card` or
   * `family_card`) and a Platform Administrator must check the number against it before it can
   * link anyone. `none` = no number saved.
   */
  status: Record<IdentifierKind, IdentifierStatus>;
};

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
  const [{ data: rows }, { data: copies }] = await Promise.all([
    supabase
      .from('person_identifiers')
      .select('kind, value, verified_at, rejected_at')
      .eq('person_id', personId),
    supabase
      .from('person_attachments')
      .select('tag')
      .eq('person_id', personId)
      .in('tag', ['unrwa_card', 'family_card']),
  ]);
  const byKind = new Map((rows ?? []).map((r) => [r.kind, r]));
  const tags = new Set<string>((copies ?? []).map((c) => c.tag));
  const statusOf = (kind: IdentifierKind, tag: string): IdentifierStatus => {
    const row = byKind.get(kind);
    if (!row) return 'none';
    if (row.verified_at) return 'verified';
    if (!tags.has(tag)) return 'needs_copy';
    return row.rejected_at ? 'rejected' : 'awaiting_check';
  };
  return {
    unrwaCard: byKind.get('unrwa_card')?.value ?? null,
    familyCard1948: byKind.get('family_card_1948')?.value ?? null,
    status: {
      unrwa_card: statusOf('unrwa_card', 'unrwa_card'),
      family_card_1948: statusOf('family_card_1948', 'family_card'),
    },
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
