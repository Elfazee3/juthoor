/**
 * Pure relationship-graph solver for the Juthoor 360° view.
 *
 * Deliberately free of I/O or React. Given a `TreeSnapshot` (persons +
 * families + family_children rows), it computes the five 360° slots
 * around any focus person:
 *
 *   - parents (father + mother slot, either may be null/placeholder)
 *   - siblings (full + half — anyone who shares at least one parent
 *     with the focus, via any family)
 *   - spouses (everyone this focus partners with, across all families)
 *   - childrenByFamily (one group per family the focus is a partner in)
 *   - focus (passthrough)
 *
 * Gender semantics: the schema models families as gender-neutral
 * partner1/partner2. The 360° view labels "father" and "mother"
 * slots, so when building the `parents` object we look up gender of
 * each partner and assign based on that. Non-M/F genders go to the
 * `father` slot by default (kept explicit in code, see TODO).
 */

import type {
  ChildGroup,
  FamilyChildLink,
  FamilyView,
  Neighbors,
  PersonView,
  TreeSnapshot,
} from './types';

export function buildNeighbors(
  snapshot: TreeSnapshot,
  focusId: string
): Neighbors {
  const personById = indexPersons(snapshot.persons);
  const focus = personById.get(focusId);
  if (!focus) {
    throw new Error(
      `focus person not found in snapshot: ${focusId}`
    );
  }

  const familyOfOriginLink = findFamilyOfOrigin(snapshot, focusId);
  const familyOfOrigin = familyOfOriginLink
    ? snapshot.families.find((f) => f.id === familyOfOriginLink.familyId) ??
      null
    : null;

  const parents = resolveParents(familyOfOrigin, personById);

  const siblings = resolveSiblings(
    snapshot,
    personById,
    familyOfOrigin,
    focusId
  );

  const ownFamilies = snapshot.families.filter(
    (f) => f.partner1Id === focusId || f.partner2Id === focusId
  );

  const spouses = resolveSpouses(ownFamilies, personById, focusId);

  const childrenByFamily = resolveChildrenByFamily(
    snapshot,
    personById,
    ownFamilies,
    focusId
  );

  return { focus, parents, siblings, spouses, childrenByFamily };
}

// ============================================================================
// Helpers — each returns a new immutable value.
// ============================================================================

function indexPersons(
  persons: readonly PersonView[]
): ReadonlyMap<string, PersonView> {
  const map = new Map<string, PersonView>();
  for (const p of persons) map.set(p.id, p);
  return map;
}

function findFamilyOfOrigin(
  snapshot: TreeSnapshot,
  focusId: string
): FamilyChildLink | null {
  return (
    snapshot.familyChildren.find((link) => link.childId === focusId) ?? null
  );
}

function resolveParents(
  family: FamilyView | null,
  personById: ReadonlyMap<string, PersonView>
): Neighbors['parents'] {
  if (!family) {
    return { father: null, mother: null, familyId: null };
  }

  const p1 = family.partner1Id ? personById.get(family.partner1Id) ?? null : null;
  const p2 = family.partner2Id ? personById.get(family.partner2Id) ?? null : null;

  // Gender-based slotting: M => father, F => mother. When a slot is
  // ambiguous (unknown gender, or both same gender), prefer the
  // partner1 column into the father slot to keep output deterministic.
  let father: PersonView | null = null;
  let mother: PersonView | null = null;

  for (const candidate of [p1, p2]) {
    if (!candidate) continue;
    if (candidate.gender === 'M' && !father) {
      father = candidate;
    } else if (candidate.gender === 'F' && !mother) {
      mother = candidate;
    } else if (!father) {
      father = candidate;
    } else if (!mother) {
      mother = candidate;
    }
  }

  return { father, mother, familyId: family.id };
}

function resolveSiblings(
  snapshot: TreeSnapshot,
  personById: ReadonlyMap<string, PersonView>,
  familyOfOrigin: FamilyView | null,
  focusId: string
): readonly PersonView[] {
  if (!familyOfOrigin) return [];

  // Siblings = children of any family that shares at least one parent
  // with the focus's family-of-origin. This naturally includes half-
  // siblings when the father (or mother) remarried.
  const parentIds = [
    familyOfOrigin.partner1Id,
    familyOfOrigin.partner2Id,
  ].filter((id): id is string => Boolean(id));

  const siblingFamilyIds = new Set<string>();
  for (const fam of snapshot.families) {
    if (
      (fam.partner1Id && parentIds.includes(fam.partner1Id)) ||
      (fam.partner2Id && parentIds.includes(fam.partner2Id))
    ) {
      siblingFamilyIds.add(fam.id);
    }
  }

  const siblingIds = new Set<string>();
  for (const link of snapshot.familyChildren) {
    if (siblingFamilyIds.has(link.familyId) && link.childId !== focusId) {
      siblingIds.add(link.childId);
    }
  }

  const siblings: PersonView[] = [];
  for (const id of siblingIds) {
    const p = personById.get(id);
    if (p) siblings.push(p);
  }

  return sortByBirthOrderThenId(siblings, snapshot.familyChildren);
}

function sortByBirthOrderThenId(
  people: readonly PersonView[],
  links: readonly FamilyChildLink[]
): readonly PersonView[] {
  const orderById = new Map<string, number>();
  for (const link of links) {
    if (link.birthOrder !== null) orderById.set(link.childId, link.birthOrder);
  }
  return [...people].sort((a, b) => {
    const oa = orderById.get(a.id);
    const ob = orderById.get(b.id);
    if (oa !== undefined && ob !== undefined) return oa - ob;
    if (oa !== undefined) return -1;
    if (ob !== undefined) return 1;
    return a.id.localeCompare(b.id);
  });
}

function resolveSpouses(
  ownFamilies: readonly FamilyView[],
  personById: ReadonlyMap<string, PersonView>,
  focusId: string
): readonly PersonView[] {
  const seen = new Set<string>();
  const spouses: PersonView[] = [];
  for (const fam of ownFamilies) {
    const otherId = fam.partner1Id === focusId ? fam.partner2Id : fam.partner1Id;
    if (!otherId || seen.has(otherId)) continue;
    const p = personById.get(otherId);
    if (p) {
      spouses.push(p);
      seen.add(otherId);
    }
  }
  return spouses;
}

function resolveChildrenByFamily(
  snapshot: TreeSnapshot,
  personById: ReadonlyMap<string, PersonView>,
  ownFamilies: readonly FamilyView[],
  focusId: string
): readonly ChildGroup[] {
  const groups: ChildGroup[] = [];
  for (const fam of ownFamilies) {
    const childLinks = snapshot.familyChildren.filter(
      (link) => link.familyId === fam.id
    );
    if (childLinks.length === 0) continue;

    const children: PersonView[] = [];
    for (const link of childLinks) {
      const p = personById.get(link.childId);
      if (p) children.push(p);
    }

    const otherParentId =
      fam.partner1Id === focusId ? fam.partner2Id : fam.partner1Id;

    groups.push({
      familyId: fam.id,
      otherParentId,
      children: sortByBirthOrderThenId(children, snapshot.familyChildren),
    });
  }
  return groups;
}
