'use server';

import { createJuthoorSupabaseClient } from '@/supabase-clients/juthoor-server';
import type { Place } from '@/types/database';

/**
 * Village/place search for the AddPerson form combobox.
 *
 * Searches `name_ar` and `name_en` with ILIKE so it's case-insensitive
 * for Latin text and works on Arabic substrings. When pg_trgm indexes
 * are live (see migration 20260417130000), this scales; until then it
 * is an accepted seq scan on 263 rows.
 */
export async function searchPlaces(
  query: string,
  limit = 20
): Promise<readonly Place[]> {
  const supabase = await createJuthoorSupabaseClient();
  const q = query.trim();

  if (q.length === 0) {
    const { data, error } = await supabase
      .from('places')
      .select('*')
      .order('name_ar', { ascending: true })
      .limit(limit);

    if (error) throw new Error(`Failed to list places: ${error.message}`);
    return data ?? [];
  }

  const pattern = `%${q}%`;
  const { data, error } = await supabase
    .from('places')
    .select('*')
    .or(`name_ar.ilike.${pattern},name_en.ilike.${pattern}`)
    .order('name_ar', { ascending: true })
    .limit(limit);

  if (error) throw new Error(`Failed to search places: ${error.message}`);
  return data ?? [];
}

export async function getPlaceById(id: string): Promise<Place | null> {
  const supabase = await createJuthoorSupabaseClient();
  const { data, error } = await supabase
    .from('places')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`Failed to load place: ${error.message}`);
  return data ?? null;
}
