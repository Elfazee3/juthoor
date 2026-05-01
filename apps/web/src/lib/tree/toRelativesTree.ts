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
 */

import type { Node, Relation } from 'relatives-tree/lib/types';

import type { TreeSnapshot } from './types';

export function toRelativesTree(snapshot: TreeSnapshot): readonly Node[] {
  const personById = new Map(snapshot.persons.map((p) => [p.id, p]));

  // --- pre-index relationships ---
  const spousesByPerson = new Map<string, Set<string>>();
  for (const fam of snapshot.families) {
    if (fam.partner1Id && fam.partner2Id) {
      addToSet(spousesByPerson, fam.partner1Id, fam.partner2Id);
      addToSet(spousesByPerson, fam.partner2Id, fam.partner1Id);
    }
  }

  // parents-of-child map, driven by family_children → families join
  const parentsByChild = new Map<string, { father?: string; mother?: string }>();
  const childrenByParent = new Map<string, Set<string>>();
  for (const link of snapshot.familyChildren) {
    const fam = snapshot.families.find((f) => f.id === link.familyId);
    if (!fam) continue;

    const p1 = fam.partner1Id ? personById.get(fam.partner1Id) : undefined;
    const p2 = fam.partner2Id ? personById.get(fam.partner2Id) : undefined;

    const father =
      p1?.gender === 'M' ? p1.id : p2?.gender === 'M' ? p2.id : p1?.id;
    const mother =
      p1?.gender === 'F' ? p1.id : p2?.gender === 'F' ? p2.id : p2?.id;

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
  return snapshot.persons.map((p) => {
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
}

function addToSet<K, V>(map: Map<K, Set<V>>, key: K, value: V): void {
  const existing = map.get(key);
  if (existing) existing.add(value);
  else map.set(key, new Set([value]));
}
