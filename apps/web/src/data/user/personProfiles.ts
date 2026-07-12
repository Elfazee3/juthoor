'use server';

import { z } from 'zod';
import { createJuthoorSupabaseClient } from '@/supabase-clients/juthoor-server';
import { getCachedLoggedInUserIdOrNull } from '@/rsc-data/supabase';

export type PersonProfile = {
  person_id: string;
  achievements_ar: string | null;
  achievements_en: string | null;
  contribution_ar: string | null;
  contribution_en: string | null;
};

const PROFILE_COLS =
  'person_id, achievements_ar, achievements_en, contribution_ar, contribution_en';

/** Narrative enrichment (achievements, contribution) for a person.
 *  Degrades gracefully to null if the row is absent OR the `person_profiles`
 *  table has not been migrated yet — so the person page is unchanged until then. */
export async function loadPersonProfile(
  personId: string,
): Promise<PersonProfile | null> {
  const supabase = await createJuthoorSupabaseClient();
  const { data, error } = await supabase
    .from('person_profiles')
    .select(PROFILE_COLS)
    .eq('person_id', personId)
    .maybeSingle();
  if (error) return null; // table missing / not yet migrated — degrade silently
  return (data as PersonProfile | null) ?? null;
}

const SaveSchema = z.object({
  personId: z.string().uuid(),
  achievementsAr: z.string().trim().max(2000).nullable().optional(),
  achievementsEn: z.string().trim().max(2000).nullable().optional(),
  contributionAr: z.string().trim().max(2000).nullable().optional(),
  contributionEn: z.string().trim().max(2000).nullable().optional(),
});

const orNull = (v: string | null | undefined): string | null => {
  const trimmed = (v ?? '').trim();
  return trimmed.length > 0 ? trimmed : null;
};

/** Upsert a person's narrative. Authorization is enforced by RLS
 *  (`can_write_tree` on the person's tree) — a non-writer's upsert is rejected. */
export async function savePersonProfile(
  input: z.input<typeof SaveSchema>,
): Promise<PersonProfile> {
  const parsed = SaveSchema.parse(input);
  const uid = await getCachedLoggedInUserIdOrNull();
  if (!uid) throw new Error('Not authenticated');
  const supabase = await createJuthoorSupabaseClient();

  const { data, error } = await supabase
    .from('person_profiles')
    .upsert(
      {
        person_id: parsed.personId,
        achievements_ar: orNull(parsed.achievementsAr),
        achievements_en: orNull(parsed.achievementsEn),
        contribution_ar: orNull(parsed.contributionAr),
        contribution_en: orNull(parsed.contributionEn),
        updated_by: uid,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'person_id' },
    )
    .select(PROFILE_COLS)
    .single();
  if (error) throw new Error(`Failed to save profile: ${error.message}`);
  return data as PersonProfile;
}
