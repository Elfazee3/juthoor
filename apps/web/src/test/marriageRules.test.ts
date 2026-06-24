import { describe, expect, it } from 'vitest';
import {
  prohibitedBloodRelatives,
  validateMarriage,
  validateNewSpouse,
} from '@/lib/tree/marriageRules';
import type {
  FamilyChildLink,
  FamilyView,
  PersonView,
  TreeSnapshot,
} from '@/lib/tree/types';
import type { GenderType } from '@/types/database';

const p = (id: string, gender: GenderType): PersonView => ({
  id,
  gender,
  displayNameAr: null,
  displayNameEn: null,
  isPlaceholder: false,
  birthYear: null,
  deathYear: null,
  placeOfOriginId: null,
});
const fam = (id: string, a: string | null, b: string | null): FamilyView => ({
  id,
  partner1Id: a,
  partner2Id: b,
});
const kid = (familyId: string, childId: string): FamilyChildLink => ({
  familyId,
  childId,
  pedigree: 'birth',
  birthOrder: null,
});

// Three-generation family:
//   GF × GM → FA (father), AU (aunt)
//   FA × MO → S (son), D (daughter)
//   W, M2 are unrelated; GF/GM/FA/MO are married couples.
const FAMILY: TreeSnapshot = {
  persons: [
    p('GF', 'M'), p('GM', 'F'), p('FA', 'M'), p('AU', 'F'),
    p('MO', 'F'), p('S', 'M'), p('D', 'F'), p('W', 'F'), p('M2', 'M'),
  ],
  families: [fam('fG', 'GF', 'GM'), fam('fP', 'FA', 'MO')],
  familyChildren: [kid('fG', 'FA'), kid('fG', 'AU'), kid('fP', 'S'), kid('fP', 'D')],
};

// A man married to four women, plus a fifth unmarried woman.
const POLY: TreeSnapshot = {
  persons: [
    p('MAN', 'M'), p('w1', 'F'), p('w2', 'F'), p('w3', 'F'), p('w4', 'F'), p('w5', 'F'),
  ],
  families: [
    fam('m1', 'MAN', 'w1'), fam('m2', 'MAN', 'w2'),
    fam('m3', 'MAN', 'w3'), fam('m4', 'MAN', 'w4'),
  ],
  familyChildren: [],
};

describe('prohibitedBloodRelatives — mahram by blood', () => {
  it('covers mother, grandmother, sister, and aunt for the son', () => {
    const rel = prohibitedBloodRelatives(FAMILY, 'S');
    expect(rel.has('MO')).toBe(true); // mother
    expect(rel.has('GM')).toBe(true); // grandmother
    expect(rel.has('D')).toBe(true); // sister
    expect(rel.has('AU')).toBe(true); // paternal aunt
    expect(rel.has('FA')).toBe(true); // father
    expect(rel.has('S')).toBe(false); // not self
    expect(rel.has('W')).toBe(false); // unrelated
  });
});

describe('validateMarriage — between two existing persons', () => {
  it('blocks a blood relative (son × aunt)', () => {
    const v = validateMarriage({ snapshot: FAMILY, aId: 'S', aGender: 'M', bId: 'AU', bGender: 'F' });
    expect(v?.code).toBe('blood_relative');
  });

  it('blocks same-gender unions', () => {
    const v = validateMarriage({ snapshot: FAMILY, aId: 'S', aGender: 'M', bId: 'FA', bGender: 'M' });
    expect(v?.code).toBe('same_gender');
  });

  it('blocks marrying a woman who already has a husband', () => {
    const v = validateMarriage({ snapshot: FAMILY, aId: 'M2', aGender: 'M', bId: 'MO', bGender: 'F' });
    expect(v?.code).toBe('woman_already_married');
  });

  it('blocks a fifth wife', () => {
    const v = validateMarriage({ snapshot: POLY, aId: 'MAN', aGender: 'M', bId: 'w5', bGender: 'F' });
    expect(v?.code).toBe('man_four_wives');
  });

  it('allows an unrelated, unmarried, opposite-gender union', () => {
    const v = validateMarriage({ snapshot: FAMILY, aId: 'S', aGender: 'M', bId: 'W', bGender: 'F' });
    expect(v).toBeNull();
  });
});

describe('validateNewSpouse — adding a brand-new spouse', () => {
  it('blocks same gender', () => {
    const v = validateNewSpouse({ snapshot: FAMILY, anchorId: 'S', anchorGender: 'M', newGender: 'M' });
    expect(v?.code).toBe('same_gender');
  });

  it('blocks a second husband for a married woman', () => {
    const v = validateNewSpouse({ snapshot: FAMILY, anchorId: 'MO', anchorGender: 'F', newGender: 'M' });
    expect(v?.code).toBe('woman_already_married');
  });

  it('blocks a fifth wife for a four-wife man', () => {
    const v = validateNewSpouse({ snapshot: POLY, anchorId: 'MAN', anchorGender: 'M', newGender: 'F' });
    expect(v?.code).toBe('man_four_wives');
  });

  it('allows a first spouse of the opposite gender', () => {
    const v = validateNewSpouse({ snapshot: FAMILY, anchorId: 'S', anchorGender: 'M', newGender: 'F' });
    expect(v).toBeNull();
  });
});
