/**
 * Marriage-recording rules — Terms & Conditions Article 6.
 *
 * Pure, I/O-free validators over a {@link TreeSnapshot}, mirroring the design of
 * `relationships.ts` so they are deterministic and unit-testable. The DB-side
 * caller (`data/user/relatives.ts`) loads a snapshot and asks these functions
 * whether a proposed union is allowed BEFORE any write happens.
 *
 * Rules enforced (T&C 6.2–6.3):
 *   - a marriage is recorded between a man and a woman (M × F);
 *   - a woman may not be married to more than one man at the same time;
 *   - a man may not be married to more than four women at the same time;
 *   - mahram by blood: no marriage between ancestor/descendant, siblings,
 *     a parent's sibling (aunt/uncle), or a sibling's child (niece/nephew).
 *
 * NOT yet enforced (documented follow-up): affinity mahram (mother-in-law,
 * sister-in-law while married to her sister, stepmother, stepsister) and
 * divorce/widowhood-aware "at the same time" counting — the count below treats
 * every recorded `families` link as a concurrent union.
 */

import type { GenderType } from '@/types/database';
import type { TreeSnapshot } from './types';

export const MAX_WIVES = 4;

export type MarriageViolationCode =
  | 'same_gender'
  | 'woman_already_married'
  | 'man_four_wives'
  | 'blood_relative';

export interface MarriageViolation {
  readonly code: MarriageViolationCode;
  readonly messageAr: string;
  readonly messageEn: string;
}

const VIOLATIONS: Record<MarriageViolationCode, Omit<MarriageViolation, 'code'>> = {
  same_gender: {
    messageAr: 'لا يمكن تسجيل زواج بين شخصين من الجنس نفسه.',
    messageEn: 'A marriage cannot be recorded between two people of the same gender.',
  },
  woman_already_married: {
    messageAr: 'لا يمكن تسجيل المرأة متزوجة من أكثر من رجل واحد في الوقت نفسه.',
    messageEn: 'A woman cannot be recorded as married to more than one man at the same time.',
  },
  man_four_wives: {
    messageAr: 'لا يمكن تسجيل الرجل متزوجًا من أكثر من أربع نساء في الوقت نفسه.',
    messageEn: 'A man cannot be recorded as married to more than four women at the same time.',
  },
  blood_relative: {
    messageAr: 'لا يمكن تسجيل زواج بين قريبين بهذه الدرجة من القرابة (محرَم).',
    messageEn: 'A marriage cannot be recorded between close blood relatives (mahram).',
  },
};

const violation = (code: MarriageViolationCode): MarriageViolation => ({
  code,
  ...VIOLATIONS[code],
});

// ============================================================================
// Graph helpers (pure)
// ============================================================================

/** Partner ids recorded as parents in the families that `personId` is a child of. */
function parentsOf(snapshot: TreeSnapshot, personId: string): string[] {
  const parentFamilyIds = new Set(
    snapshot.familyChildren
      .filter((l) => l.childId === personId)
      .map((l) => l.familyId),
  );
  const parents = new Set<string>();
  for (const fam of snapshot.families) {
    if (!parentFamilyIds.has(fam.id)) continue;
    if (fam.partner1Id) parents.add(fam.partner1Id);
    if (fam.partner2Id) parents.add(fam.partner2Id);
  }
  return [...parents];
}

/** Children recorded in the families that `personId` is a partner in. */
function childrenOf(snapshot: TreeSnapshot, personId: string): string[] {
  const ownFamilyIds = new Set(
    snapshot.families
      .filter((f) => f.partner1Id === personId || f.partner2Id === personId)
      .map((f) => f.id),
  );
  const children = new Set<string>();
  for (const link of snapshot.familyChildren) {
    if (ownFamilyIds.has(link.familyId)) children.add(link.childId);
  }
  return [...children];
}

/** Recorded spouses (the other partner in every family `personId` belongs to). */
export function spouseIdsOf(snapshot: TreeSnapshot, personId: string): string[] {
  const spouses = new Set<string>();
  for (const fam of snapshot.families) {
    if (fam.partner1Id === personId && fam.partner2Id) spouses.add(fam.partner2Id);
    else if (fam.partner2Id === personId && fam.partner1Id) spouses.add(fam.partner1Id);
  }
  return [...spouses];
}

/** Siblings: anyone who shares at least one parent with `personId`. */
function siblingsOf(snapshot: TreeSnapshot, personId: string): Set<string> {
  const myParents = new Set(parentsOf(snapshot, personId));
  if (myParents.size === 0) return new Set();
  const siblingFamilyIds = new Set<string>();
  for (const fam of snapshot.families) {
    if (
      (fam.partner1Id && myParents.has(fam.partner1Id)) ||
      (fam.partner2Id && myParents.has(fam.partner2Id))
    ) {
      siblingFamilyIds.add(fam.id);
    }
  }
  const siblings = new Set<string>();
  for (const link of snapshot.familyChildren) {
    if (siblingFamilyIds.has(link.familyId) && link.childId !== personId) {
      siblings.add(link.childId);
    }
  }
  return siblings;
}

function transitive(
  start: string,
  step: (id: string) => string[],
): Set<string> {
  const seen = new Set<string>();
  const stack = step(start);
  while (stack.length > 0) {
    const next = stack.pop() as string;
    if (seen.has(next)) continue;
    seen.add(next);
    for (const n of step(next)) if (!seen.has(n)) stack.push(n);
  }
  return seen;
}

/**
 * All blood relatives of `personId` within the mahram degrees that bar marriage:
 * ancestors, descendants, siblings, parents' siblings (aunts/uncles), and
 * siblings' children (nieces/nephews).
 */
export function prohibitedBloodRelatives(
  snapshot: TreeSnapshot,
  personId: string,
): Set<string> {
  const ancestors = transitive(personId, (id) => parentsOf(snapshot, id));
  const descendants = transitive(personId, (id) => childrenOf(snapshot, id));
  const siblings = siblingsOf(snapshot, personId);

  const auntsUncles = new Set<string>();
  for (const parent of parentsOf(snapshot, personId)) {
    for (const s of siblingsOf(snapshot, parent)) auntsUncles.add(s);
  }

  const niecesNephews = new Set<string>();
  for (const sib of siblings) {
    for (const child of childrenOf(snapshot, sib)) niecesNephews.add(child);
  }

  const all = new Set<string>([
    ...ancestors,
    ...descendants,
    ...siblings,
    ...auntsUncles,
    ...niecesNephews,
  ]);
  all.delete(personId);
  return all;
}

// ============================================================================
// Validators
// ============================================================================

const isMF = (g: GenderType): g is 'M' | 'F' => g === 'M' || g === 'F';

/**
 * Validate a union between two EXISTING persons (e.g. recording a father×mother
 * union when adding a child with a chosen existing mother). Returns the first
 * violation found, or null if the union is allowed.
 */
export function validateMarriage(args: {
  snapshot: TreeSnapshot;
  aId: string;
  aGender: GenderType;
  bId: string;
  bGender: GenderType;
}): MarriageViolation | null {
  const { snapshot, aId, aGender, bId, bGender } = args;

  if (aGender === bGender) return violation('same_gender');

  // Count rules apply when we can identify a man and a woman.
  if (isMF(aGender) && isMF(bGender)) {
    const womanId = aGender === 'F' ? aId : bId;
    const manId = aGender === 'M' ? aId : bId;

    const otherHusbands = spouseIdsOf(snapshot, womanId).filter((id) => id !== manId);
    if (otherHusbands.length >= 1) return violation('woman_already_married');

    const otherWives = spouseIdsOf(snapshot, manId).filter((id) => id !== womanId);
    if (otherWives.length >= MAX_WIVES) return violation('man_four_wives');
  }

  if (prohibitedBloodRelatives(snapshot, aId).has(bId)) {
    return violation('blood_relative');
  }
  return null;
}

/**
 * Validate adding a BRAND-NEW spouse to an existing anchor person. The new
 * person has no id yet, so blood-relation cannot apply — only gender and the
 * anchor's concurrent-spouse count are checked.
 */
export function validateNewSpouse(args: {
  snapshot: TreeSnapshot;
  anchorId: string;
  anchorGender: GenderType;
  newGender: 'M' | 'F';
}): MarriageViolation | null {
  const { snapshot, anchorId, anchorGender, newGender } = args;

  if (anchorGender === newGender) return violation('same_gender');

  const anchorSpouseCount = spouseIdsOf(snapshot, anchorId).length;
  // Anchor is the woman → she may have no other husband.
  if (anchorGender === 'F' && anchorSpouseCount >= 1) {
    return violation('woman_already_married');
  }
  // Anchor is the man → he may have at most four wives.
  if (anchorGender === 'M' && anchorSpouseCount >= MAX_WIVES) {
    return violation('man_four_wives');
  }
  return null;
}
