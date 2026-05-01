'use server';

import { createJuthoorSupabaseClient } from '@/supabase-clients/juthoor-server';

export type PathNode = {
  person_id: string;
  relation: 'self' | 'parent' | 'child' | 'spouse' | 'sibling';
  name_ar: string | null;
  name_en: string | null;
  gender: 'M' | 'F' | 'X' | 'U' | null;
};

export type DegreesResult = {
  degrees: number;
  path: PathNode[];
  cached?: boolean;
} | null;

/**
 * Resolve the viewer's self-person id from their profile. Returns null if the
 * user hasn't completed the "Add yourself" onboarding.
 */
export async function getSelfPersonId(): Promise<string | null> {
  const supabase = await createJuthoorSupabaseClient();
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData.user?.id;
  if (!userId) return null;
  const { data } = await supabase
    .from('profiles')
    .select('self_person_id')
    .eq('id', userId)
    .maybeSingle();
  return ((data as { self_person_id: string | null } | null)?.self_person_id) ?? null;
}

export async function computeDegreesTo(targetPersonId: string): Promise<DegreesResult> {
  const selfId = await getSelfPersonId();
  if (!selfId || !targetPersonId || selfId === targetPersonId) return null;
  const supabase = await createJuthoorSupabaseClient();
  const { data, error } = await supabase.rpc('compute_degrees', {
    p_source: selfId,
    p_target: targetPersonId,
  });
  if (error) {
    // Non-fatal: swallow to avoid breaking the result card.
    return null;
  }
  if (!data) return null;
  return data as DegreesResult;
}
