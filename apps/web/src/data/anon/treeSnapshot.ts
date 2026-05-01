'use server';

import { getTreeFamilies, getTreeFamilyChildren } from './families';
import { getTreePersons } from './persons';

import type {
  FamilyChildLink,
  FamilyView,
  PersonView,
  TreeSnapshot,
} from '@/lib/tree/types';
import type { Family, FamilyChild, Person } from '@/types/database';

/**
 * Loads every row needed to compute 360° neighbours for any person in
 * the tree, then returns a `TreeSnapshot` ready for `buildNeighbors`.
 *
 * Why one bulk load: the 360° view is the hot path — we want a single
 * round-trip that can be cached (SWR, React Query), with all
 * client-side re-centring handled purely in memory.
 */
export async function getTreeSnapshot(treeId: string): Promise<TreeSnapshot> {
  const [persons, families, familyChildren] = await Promise.all([
    getTreePersons(treeId),
    getTreeFamilies(treeId),
    getTreeFamilyChildren(treeId),
  ]);

  return {
    persons: persons.map(toPersonView),
    families: families.map(toFamilyView),
    familyChildren: familyChildren.map(toFamilyChildLink),
  };
}

function toPersonView(p: Person): PersonView {
  return {
    id: p.id,
    gender: p.gender,
    displayNameAr: p.display_name_ar,
    displayNameEn: p.display_name_en,
    // `notes === 'placeholder'` is the convention used by the
    // create_person_with_primary_name RPC to mark Female-N placeholder
    // rows. We may later migrate this to a dedicated column.
    isPlaceholder: p.notes === 'placeholder',
    birthYear: null,
    deathYear: null,
    placeOfOriginId: null,
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
