'use server';

import { createJuthoorSupabaseClient } from '@/supabase-clients/juthoor-server';

export type FamilyAcrossVillagesGroup = {
  village_id: string | null;
  village_ar: string | null;
  village_en: string | null;
  count: number;
  sample_persons: Array<{
    person_id: string;
    name_ar: string | null;
    name_en: string | null;
    birth_year: number | null;
    tree_id: string;
    tree_name: string | null;
  }>;
};

export type FamilySurnameOverview = {
  surname: string;
  total_persons: number;
  total_villages: number;
  total_trees: number;
  groups: FamilyAcrossVillagesGroup[];
};

/**
 * Aggregate every person whose primary surname matches `surname`,
 * group them by their place_of_origin (BIRT event place_id), so the UI
 * can render "Al-Ajrami families across villages" — the
 * cross-village family page.
 *
 * Goes wide on a single surname; designed for the /families/[surname]
 * route. Limited to public + accessible trees by RLS.
 */
export async function loadFamilyAcrossVillages(
  surname: string,
): Promise<FamilySurnameOverview> {
  const supabase = await createJuthoorSupabaseClient();
  const trimmed = surname.trim();
  if (!trimmed) {
    return { surname: '', total_persons: 0, total_villages: 0, total_trees: 0, groups: [] };
  }

  // 1) Person ids whose primary name has this surname.
  const { data: nameRows, error: nameErr } = await supabase
    .from('person_names')
    .select('person_id, surname, lang, name_type')
    .ilike('surname', trimmed)
    .limit(2000);
  if (nameErr) throw new Error(`Failed to query surnames: ${nameErr.message}`);
  const personIds = Array.from(
    new Set(((nameRows ?? []) as Array<{ person_id: string }>).map((r) => r.person_id)),
  );
  if (personIds.length === 0) {
    return {
      surname: trimmed,
      total_persons: 0,
      total_villages: 0,
      total_trees: 0,
      groups: [],
    };
  }

  // 2) Persons themselves (RLS gates which ones we can see).
  const { data: personRows, error: pErr } = await supabase
    .from('persons')
    .select('id, display_name_ar, display_name_en, gender, tree_id')
    .in('id', personIds);
  if (pErr) throw new Error(`Failed to load persons: ${pErr.message}`);

  // 3) Tree names for the names label on each card.
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

  // 4) Birth events for these persons → join with places to group.
  const { data: birtRows, error: bErr } = await supabase
    .from('events')
    .select('person_id, date_year, place_id, places ( id, name_ar, name_en )')
    .in('person_id', personIds)
    .eq('event_type', 'BIRT');
  if (bErr) throw new Error(`Failed to load birth events: ${bErr.message}`);

  type BirtRow = {
    person_id: string;
    date_year: number | null;
    place_id: string | null;
    places: { id: string; name_ar: string; name_en: string | null } | null;
  };
  const birtByPerson = new Map<
    string,
    { year: number | null; place_id: string | null; place_ar: string | null; place_en: string | null }
  >();
  for (const r of (birtRows as unknown as BirtRow[]) ?? []) {
    if (!birtByPerson.has(r.person_id)) {
      birtByPerson.set(r.person_id, {
        year: r.date_year,
        place_id: r.place_id,
        place_ar: r.places?.name_ar ?? null,
        place_en: r.places?.name_en ?? null,
      });
    }
  }

  // 5) Group persons by birth-place id.
  type Bucket = {
    place_id: string | null;
    place_ar: string | null;
    place_en: string | null;
    persons: FamilyAcrossVillagesGroup['sample_persons'];
  };
  const buckets = new Map<string, Bucket>();
  for (const p of (personRows ?? []) as Array<{
    id: string;
    display_name_ar: string | null;
    display_name_en: string | null;
    gender: string | null;
    tree_id: string;
  }>) {
    const birt = birtByPerson.get(p.id);
    const placeKey = birt?.place_id ?? 'unknown';
    const existing = buckets.get(placeKey);
    const treeName = treeNameById.get(p.tree_id) ?? null;
    const personEntry = {
      person_id: p.id,
      name_ar: p.display_name_ar,
      name_en: p.display_name_en,
      birth_year: birt?.year ?? null,
      tree_id: p.tree_id,
      tree_name: treeName,
    };
    if (existing) {
      existing.persons.push(personEntry);
    } else {
      buckets.set(placeKey, {
        place_id: birt?.place_id ?? null,
        place_ar: birt?.place_ar ?? null,
        place_en: birt?.place_en ?? null,
        persons: [personEntry],
      });
    }
  }

  const groups: FamilyAcrossVillagesGroup[] = Array.from(buckets.values())
    .map((b) => ({
      village_id: b.place_id,
      village_ar: b.place_ar,
      village_en: b.place_en,
      count: b.persons.length,
      sample_persons: b.persons.slice(0, 12),
    }))
    .sort((a, b) => b.count - a.count);

  return {
    surname: trimmed,
    total_persons: (personRows ?? []).length,
    total_villages: groups.filter((g) => g.village_id !== null).length,
    total_trees: treeIds.length,
    groups,
  };
}
