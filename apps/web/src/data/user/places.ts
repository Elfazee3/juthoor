'use server';

import { createJuthoorSupabaseClient } from '@/supabase-clients/juthoor-server';

export type PlaceType = 'village' | 'city' | 'clan_locality' | 'khirba';

export type PlaceListItem = {
  id: string;
  name_ar: string;
  name_en: string | null;
  place_type: PlaceType | null;
  district_ar: string | null;
  district_en: string | null;
  depopulated_year: number | null;
  is_depopulated: boolean | null;
};

export type PlaceTypeCounts = {
  village: number;
  city: number;
  clan_locality: number;
  khirba: number;
  total: number;
};

export async function loadAllPlaces(): Promise<PlaceListItem[]> {
  const supabase = await createJuthoorSupabaseClient();
  const { data, error } = await supabase
    .from('places')
    .select('id, name_ar, name_en, place_type, district_ar, district_en, depopulated_year, is_depopulated')
    .order('name_ar', { ascending: true });
  if (error) throw new Error(`Failed to load places: ${error.message}`);
  return (data ?? []) as PlaceListItem[];
}

export async function loadPlaceTypeCounts(): Promise<PlaceTypeCounts> {
  const supabase = await createJuthoorSupabaseClient();
  const { data, error } = await supabase.from('places').select('place_type');
  if (error) throw new Error(`Failed to count places: ${error.message}`);

  const counts: PlaceTypeCounts = {
    village: 0,
    city: 0,
    clan_locality: 0,
    khirba: 0,
    total: 0,
  };
  for (const row of data ?? []) {
    const type = (row as { place_type: string | null }).place_type;
    if (type === 'village') counts.village++;
    else if (type === 'city') counts.city++;
    else if (type === 'clan_locality') counts.clan_locality++;
    else if (type === 'khirba') counts.khirba++;
    counts.total++;
  }
  return counts;
}

export type PlaceDetail = PlaceListItem & {
  // Future: lat/lng, history, photo
};

export async function loadPlaceById(id: string): Promise<PlaceDetail | null> {
  const supabase = await createJuthoorSupabaseClient();
  const { data, error } = await supabase
    .from('places')
    .select('id, name_ar, name_en, place_type, district_ar, district_en, depopulated_year, is_depopulated')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`Failed to load place: ${error.message}`);
  return (data as PlaceDetail | null) ?? null;
}

export type PlacePerson = {
  person_id: string;
  display_name_ar: string | null;
  display_name_en: string | null;
  gender: string | null;
  birth_year: number | null;
  tree_id: string;
  tree_name: string | null;
};

/** People whose BIRT event references this place. Two-step (events → persons,
 *  then trees) — keeping RLS happy and avoiding the nested-!inner quirk where
 *  PostgREST's join planner sometimes drops rows even when the data is
 *  visible. Limited to public + accessible trees by RLS. */
export async function loadPersonsFromPlace(
  placeId: string,
  limit = 200,
): Promise<PlacePerson[]> {
  const supabase = await createJuthoorSupabaseClient();
  const { data: eventRows, error: eErr } = await supabase
    .from('events')
    .select('person_id, date_year')
    .eq('place_id', placeId)
    .eq('event_type', 'BIRT')
    .limit(limit);
  if (eErr) throw new Error(`Failed to load events for place: ${eErr.message}`);
  const personIds = Array.from(
    new Set(((eventRows ?? []) as Array<{ person_id: string }>).map((r) => r.person_id)),
  );
  if (personIds.length === 0) return [];

  const { data: personRows, error: pErr } = await supabase
    .from('persons')
    .select('id, display_name_ar, display_name_en, gender, tree_id')
    .in('id', personIds);
  if (pErr) throw new Error(`Failed to load persons: ${pErr.message}`);

  const treeIds = Array.from(
    new Set(((personRows ?? []) as Array<{ tree_id: string }>).map((r) => r.tree_id)),
  );
  const treeNameById = new Map<string, string | null>();
  if (treeIds.length > 0) {
    const { data: treeRows } = await supabase
      .from('trees')
      .select('id, name_ar, name_en')
      .in('id', treeIds);
    for (const t of (treeRows ?? []) as Array<{
      id: string;
      name_ar: string | null;
      name_en: string | null;
    }>) {
      treeNameById.set(t.id, t.name_ar ?? t.name_en ?? null);
    }
  }
  const yearByPerson = new Map<string, number | null>();
  for (const r of (eventRows ?? []) as Array<{ person_id: string; date_year: number | null }>) {
    if (!yearByPerson.has(r.person_id)) yearByPerson.set(r.person_id, r.date_year);
  }
  type PersonRow = {
    id: string;
    display_name_ar: string | null;
    display_name_en: string | null;
    gender: string | null;
    tree_id: string;
  };
  return ((personRows ?? []) as PersonRow[]).map((p) => ({
    person_id: p.id,
    display_name_ar: p.display_name_ar,
    display_name_en: p.display_name_en,
    gender: p.gender,
    birth_year: yearByPerson.get(p.id) ?? null,
    tree_id: p.tree_id,
    tree_name: treeNameById.get(p.tree_id) ?? null,
  }));
}

export type SurnameGroupItem = {
  surname_ar: string | null;
  surname_en: string | null;
  count: number;
};

/** Surnames represented in this place — for "families from this village". */
export async function loadSurnamesFromPlace(placeId: string): Promise<SurnameGroupItem[]> {
  const supabase = await createJuthoorSupabaseClient();
  // Get persons born in this place, then join their primary surname.
  const { data, error } = await supabase
    .from('events')
    .select(`
      persons!inner (
        id,
        person_names!inner ( surname, surname_phonetic, lang, name_type )
      )
    `)
    .eq('place_id', placeId)
    .eq('event_type', 'BIRT');
  if (error) throw new Error(`Failed to load surnames from place: ${error.message}`);

  type Row = {
    persons: {
      id: string;
      person_names: Array<{
        surname: string | null;
        lang: string | null;
        name_type: string | null;
      }>;
    };
  };
  const map = new Map<string, { ar: string | null; en: string | null; count: number }>();
  for (const row of (data as unknown as Row[]) ?? []) {
    const names = row.persons?.person_names ?? [];
    const primary = names.find((n) => n.name_type === 'birth') ?? names[0];
    if (!primary?.surname) continue;
    const key = primary.surname.trim();
    if (!key) continue;
    const existing = map.get(key);
    if (existing) {
      existing.count++;
    } else {
      const isArabic = /[؀-ۿ]/.test(key);
      map.set(key, {
        ar: isArabic ? key : null,
        en: isArabic ? null : key,
        count: 1,
      });
    }
  }
  return Array.from(map.values())
    .map((v) => ({ surname_ar: v.ar, surname_en: v.en, count: v.count }))
    .sort((a, b) => b.count - a.count);
}
