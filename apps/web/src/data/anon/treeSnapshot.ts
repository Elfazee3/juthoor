'use server';

import { getTreeFamilies, getTreeFamilyChildren } from './families';
import { getTreePersons } from './persons';

import { createJuthoorSupabaseClient } from '@/supabase-clients/juthoor-server';
import type {
  FamilyChildLink,
  FamilyView,
  PersonView,
  TreeSnapshot,
} from '@/lib/tree/types';
import type { Family, FamilyChild, Person } from '@/types/database';

/** Birth/death facts derived from GEDCOM BIRT/DEAT event rows. */
interface LifeFacts {
  readonly birthYear: number | null;
  readonly deathYear: number | null;
  readonly birthPlaceId: string | null;
  readonly birthPlaceAr: string | null;
}

const EMPTY_FACTS: LifeFacts = {
  birthYear: null,
  deathYear: null,
  birthPlaceId: null,
  birthPlaceAr: null,
};

/**
 * Loads every row needed to compute 360° neighbours for any person in
 * the tree, then returns a `TreeSnapshot` ready for `buildNeighbors`.
 *
 * Why one bulk load: the 360° view is the hot path — we want a single
 * round-trip that can be cached (SWR, React Query), with all
 * client-side re-centring handled purely in memory.
 *
 * Life years live on `events` (GEDCOM BIRT/DEAT), not on the persons
 * row — they're bulk-loaded here and merged into each PersonView so
 * chart cards and the side panel can show "1950 – 2020" + village.
 */
export async function getTreeSnapshot(treeId: string): Promise<TreeSnapshot> {
  const [persons, families, familyChildren, lifeFacts] = await Promise.all([
    getTreePersons(treeId),
    getTreeFamilies(treeId),
    getTreeFamilyChildren(treeId),
    getTreeLifeFacts(treeId),
  ]);

  return {
    persons: persons.map((p) => toPersonView(p, lifeFacts.get(p.id))),
    families: families.map(toFamilyView),
    familyChildren: familyChildren.map(toFamilyChildLink),
  };
}

/** One query: all BIRT/DEAT events (+ birth place name) for a tree. */
async function getTreeLifeFacts(
  treeId: string
): Promise<ReadonlyMap<string, LifeFacts>> {
  const supabase = await createJuthoorSupabaseClient();
  const { data, error } = await supabase
    .from('events')
    .select(
      'person_id, event_type, date_year, place_id, places(name_ar), persons!inner(tree_id)'
    )
    .eq('persons.tree_id', treeId)
    .in('event_type', ['BIRT', 'DEAT'])
    .not('person_id', 'is', null);

  if (error) {
    throw new Error(`Failed to load life events: ${error.message}`);
  }

  // Embedded relations (places/persons) aren't modeled in the hand-written
  // Database type, so the row shape needs an explicit cast.
  interface LifeEventRow {
    readonly person_id: string;
    readonly event_type: 'BIRT' | 'DEAT';
    readonly date_year: number | null;
    readonly place_id: string | null;
    readonly places: { readonly name_ar: string | null } | null;
  }
  const rows = (data ?? []) as unknown as readonly LifeEventRow[];

  const byPerson = new Map<string, LifeFacts>();
  for (const row of rows) {
    const personId = row.person_id;
    const current = byPerson.get(personId) ?? EMPTY_FACTS;
    const place = row.places;

    if (row.event_type === 'BIRT') {
      byPerson.set(personId, {
        ...current,
        birthYear: row.date_year ?? current.birthYear,
        birthPlaceId: row.place_id ?? current.birthPlaceId,
        birthPlaceAr: place?.name_ar ?? current.birthPlaceAr,
      });
    } else {
      byPerson.set(personId, {
        ...current,
        deathYear: row.date_year ?? current.deathYear,
      });
    }
  }
  return byPerson;
}

function toPersonView(p: Person, facts: LifeFacts | undefined): PersonView {
  return {
    id: p.id,
    gender: p.gender,
    displayNameAr: p.display_name_ar,
    displayNameEn: p.display_name_en,
    // `notes === 'placeholder'` is the convention used by the
    // create_person_with_primary_name RPC to mark Female-N placeholder
    // rows. We may later migrate this to a dedicated column.
    isPlaceholder: p.notes === 'placeholder',
    birthYear: facts?.birthYear ?? null,
    deathYear: facts?.deathYear ?? null,
    placeOfOriginId: facts?.birthPlaceId ?? null,
    birthPlaceAr: facts?.birthPlaceAr ?? null,
  };
}

function toFamilyView(f: Family): FamilyView {
  return {
    id: f.id,
    partner1Id: f.partner1_id,
    partner2Id: f.partner2_id,
  };
}

function toFamilyChildLink(link: FamilyChild): FamilyChildLink {
  return {
    familyId: link.family_id,
    childId: link.child_id,
    pedigree: link.pedigree,
    birthOrder: link.birth_order,
  };
}
