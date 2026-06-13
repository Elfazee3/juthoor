import { describe, expect, it } from 'vitest';

import { toRelativesTree } from '../toRelativesTree';
import {
  multiSpouseFixture,
  nuclearFamilyFixture,
  placeholderMotherFixture,
} from './fixtures';

describe('toRelativesTree — shape', () => {
  it('maps every person to one node with the correct gender', () => {
    const nodes = toRelativesTree(nuclearFamilyFixture);
    expect(nodes).toHaveLength(4);
    const ahmad = nodes.find((n) => n.id === 'p-ahmad')!;
    expect(ahmad.gender).toBe('male');
    const fatima = nodes.find((n) => n.id === 'p-fatima')!;
    expect(fatima.gender).toBe('female');
  });

  it('marks placeholder persons so relatives-tree can style them', () => {
    const nodes = toRelativesTree(placeholderMotherFixture);
    const placeholder = nodes.find((n) => n.id === 'p-ph-1')!;
    expect(placeholder.placeholder).toBe(true);
  });

  it('wires spouse relations both directions', () => {
    const nodes = toRelativesTree(nuclearFamilyFixture);
    const ahmad = nodes.find((n) => n.id === 'p-ahmad')!;
    const fatima = nodes.find((n) => n.id === 'p-fatima')!;
    expect(ahmad.spouses.some((s) => s.id === 'p-fatima')).toBe(true);
    expect(fatima.spouses.some((s) => s.id === 'p-ahmad')).toBe(true);
  });

  it('wires parent / child links through both nodes', () => {
    const nodes = toRelativesTree(nuclearFamilyFixture);
    const sami = nodes.find((n) => n.id === 'p-sami')!;
    expect(sami.parents.map((p) => p.id).sort()).toEqual([
      'p-ahmad',
      'p-fatima',
    ]);
    const ahmad = nodes.find((n) => n.id === 'p-ahmad')!;
    expect(ahmad.children.map((c) => c.id).sort()).toEqual([
      'p-layla',
      'p-sami',
    ]);
  });

  it('populates sibling relations for full and half siblings', () => {
    const nodes = toRelativesTree(nuclearFamilyFixture);
    const sami = nodes.find((n) => n.id === 'p-sami')!;
    expect(sami.siblings.map((s) => s.id)).toEqual(['p-layla']);

    const multi = toRelativesTree(multiSpouseFixture);
    const yusuf = multi.find((n) => n.id === 'p-yusuf')!;
    const yusufSibs = yusuf.siblings.map((s) => s.id).sort();
    expect(yusufSibs).toEqual(['p-omar', 'p-sara']);
  });

  it('emits children relations only for nuclear families not half-sibling links', () => {
    const multi = toRelativesTree(multiSpouseFixture);
    const ahmad = multi.find((n) => n.id === 'p-ahmad')!;
    expect(ahmad.children.map((c) => c.id).sort()).toEqual([
      'p-omar',
      'p-sara',
      'p-yusuf',
    ]);
  });

  it('produces nodes that satisfy the relatives-tree Node shape (id, gender, arrays)', () => {
    const nodes = toRelativesTree(nuclearFamilyFixture);
    for (const n of nodes) {
      expect(typeof n.id).toBe('string');
      expect(['male', 'female']).toContain(n.gender);
      expect(Array.isArray(n.parents)).toBe(true);
      expect(Array.isArray(n.children)).toBe(true);
      expect(Array.isArray(n.siblings)).toBe(true);
      expect(Array.isArray(n.spouses)).toBe(true);
    }
  });
});
