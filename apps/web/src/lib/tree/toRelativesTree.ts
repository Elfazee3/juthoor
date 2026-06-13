/**
 * Adapter: Juthoor TreeSnapshot → relatives-tree Node[].
 *
 * `relatives-tree` is a pure layout algorithm — given a flat list of
 * nodes where each has `parents`/`children`/`siblings`/`spouses`
 * relations, it computes (x, y) positions for rendering a whole
 * family chart. We feed it our snapshot by exploding each person
 * into its four relation arrays.
 *
 * Keep this pure — no React, no DB. It's used in Phase-5 FamilyChart
 * and is unit-tested with fixtures.
 *
 * Gender mapping: relatives-tree uses the literal strings "male"|"female";
 * our schema has M|F|X|U. Anything non-F collapses to "male" so chart
 * rendering stays gendered (placeholder dashed tile differentiates the
 * unknown case).
 *
 * Phantom partners: a family with ONE recorded parent + children breaks
 * relatives-tree's descendant placement (children only hang off couple
 * units), so for each such family we synthesize an invisible
 * `phantom-<familyId>` partner. FamilyChart renders phantoms as ghost
 * "add the mother/father" cards — Ancestry-style — so the gap in the
 * data becomes a visible, clickable repair affordance instead of a
 * silently missing branch.
 */

import type { Node, Relation } from 'relatives-tree/lib/types';

import type { TreeSnapshot } from './types';

export const PHANTOM_PREFIX = 'phantom-';

export function phantomIdForFamily(familyId: string): string {
  return `${PHANTOM_PREFIX}${familyId}`;
}

export function isPhantomId(nodeId: string): boolean {
  return nodeId.startsWith(PHANTOM_PREFIX);
}

/** familyId encoded in a phantom node id. */
export function familyIdOfPhantom(nodeId: string): string {
  return nodeId.slice(PHANTOM_PREFIX.length);
}

export function toRelativesTree(snapshot: TreeSnapshot): readonly Node[] {
  const personById = new Map(snapshot.persons.map((p) => [p.id, p]));

  // --- phantom partners for single-parent families with children ---
  interface Phantom {
    readonly id: string;
    readonly gender: 'male' | 'female';
    readonly soloId: string;
    readonly childIds: readonly string[];
  }
  const phantoms: Phantom[] = [];
  for (const fam of snapshot.families) {
    const knownIds = [fam.partner1Id, fam.partner2Id].filter(
      (id): id is string => Boolean(id && personById.has(id))
    );
    if (knownIds.length !== 1) continue;
    const childIds = snapshot.familyChildren
      .filter((l) => l.familyId === fam.id)
      .map((l) => l.childId)
      .filter((id) => personById.has(id));
    if (childIds.length === 0) continue;
    const solo = personById.get(knownIds[0]);
    if (!solo) continue;
    phantoms.push({
      id: phantomIdForFamily(fam.id),
      gender: solo.gender === 'F' ? 'male' : 'female',
      soloId: solo.id,
      childIds,
    });
  }
  const phantomByFamilyChild = new Map<string, Phantom>();
  for (const ph of phantoms) {
    for (const childId of ph.childIds) {
      phantomByFamilyChild.set(childId, ph);
    }
  }

  // --- pre-index relationships ---
  const spousesByPerson = new Map<string, Set<string>>();
  for (const fam of snapshot.families) {
    if (fam.partner1Id && fam.partner2Id) {
      addToSet(spousesByPerson, fam.partner1Id, fam.partner2Id);
      addToSet(spousesByPerson, fam.partner2Id, fam.partner1Id);
    }
  }
  for (const ph of phantoms) {
    addToSet(spousesByPerson, ph.soloId, ph.id);
    addToSet(spousesByPerson, ph.id, ph.soloId);
  }

  // parents-of-child map, driven by family_children → families join
  const parentsByChild = new Map<string, { father?: string; mother?: string }>();
  const childrenByParent = new Map<string, Set<string>>();
  for (const link of snapshot.familyChildren) {
    const fam = snapshot.families.find((f) => f.id === link.familyId);
    if (!fam) continue;

    const p1 = fam.partner1Id ? personById.get(fam.partner1Id) : undefined;
    const p2 = fam.partner2Id ? personById.get(fam.partner2Id) : undefined;

    // Assign by gender first; any X/U-gender partner fills the remaining
    // empty slot. Never assign the same person to both slots (single-
    // parent families would otherwise duplicate the parent relation).
    let father = p1?.gender === 'M' ? p1.id : p2?.gender === 'M' ? p2.id : undefined;
    let mother = p1?.gender === 'F' ? p1.id : p2?.gender === 'F' ? p2.id : undefined;
    for (const partner of [p1, p2]) {
      if (!partner || partner.id === father || partner.id === mother) continue;
      if (!father) father = partner.id;
      else if (!mother) mother = partner.id;
    }

    // Single-parent family → the phantom fills the missing slot so the
    // child stays placeable under a full couple unit.
    const phantom = phantomByFamilyChild.get(link.childId);
    if (phantom && phantom.id === phantomIdForFamily(link.familyId)) {
      if (!father && phantom.gender === 'male') father = phantom.id;
      else if (!mother) mother = phantom.id;
    }

    parentsByChild.set(link.childId, { father, mother });
    if (father) addToSet(childrenByParent, father, link.childId);
    if (mother) addToSet(childrenByParent, mother, link.childId);
  }

  // siblings: anyone sharing at least one parent with me
  const siblingsByPerson = new Map<string, Set<string>>();
  for (const [childId, { father, mother }] of parentsByChild) {
    const sibs = new Set<string>();
    if (father) {
      for (const other of childrenByParent.get(father) ?? []) {
        if (other !== childId) sibs.add(other);
      }
    }
    if (mother) {
      for (const other of childrenByParent.get(mother) ?? []) {
        if (other !== childId) sibs.add(other);
      }
    }
    siblingsByPerson.set(childId, sibs);
  }

  // --- emit nodes ---
  const personNodes: Node[] = snapshot.persons.map((p) => {
    const parents = parentsByChild.get(p.id);
    const parentRels: Relation[] = [];
    if (parents?.father) parentRels.push({ id: parents.father, type: 'blood' as never });
    if (parents?.mother) parentRels.push({ id: parents.mother, type: 'blood' as never });

    const children: Relation[] = Array.from(childrenByParent.get(p.id) ?? [])
      .map((id) => ({ id, type: 'blood' as never }));

    const siblings: Relation[] = Array.from(siblingsByPerson.get(p.id) ?? [])
      .map((id) => ({ id, type: 'blood' as never }));

    const spouses: Relation[] = Array.from(spousesByPerson.get(p.id) ?? [])
      .map((id) => ({ id, type: 'married' as never }));

    return {
      id: p.id,
      gender: p.gender === 'F' ? ('female' as never) : ('male' as never),
      parents: parentRels,
      children,
      siblings,
      spouses,
      placeholder: p.isPlaceholder || undefined,
    } satisfies Node;
  });

  const phantomNodes: Node[] = phantoms.map((ph) => ({
    id: ph.id,
    gender: ph.gender as never,
    parents: [],
    children: Array.from(childrenByParent.get(ph.id) ?? []).map((id) => ({
      id,
      type: 'blood' as never,
    })),
    siblings: [],
    spouses: [{ id: ph.soloId, type: 'married' as never }],
    placeholder: true,
  }));

  return [...personNodes, ...phantomNodes];
}

function addToSet<K, V>(map: Map<K, Set<V>>, key: K, value: V): void {
  const existing = map.get(key);
  if (existing) existing.add(value);
  else map.set(key, new Set([value]));
}
