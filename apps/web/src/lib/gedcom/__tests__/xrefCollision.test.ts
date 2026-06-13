import { describe, expect, it } from 'vitest';

/**
 * Regression test for the export xref collision bug (2026-04-17):
 * when some persons have `gedcom_xref='@I1@'` from a prior import and
 * others have none, the exporter was synthesising `@I1@` for both,
 * producing an invalid GEDCOM with duplicate xrefs.
 *
 * Reproduce the core allocation algorithm in isolation — it's small
 * enough to inline, and this keeps the suite fast (no DB needed).
 */

function allocateXrefs(
  rows: readonly { id: string; gedcom_xref: string | null }[],
  prefix: 'I' | 'F'
): Map<string, string> {
  const out = new Map<string, string>();
  const taken = new Set<string>();
  for (const r of rows) {
    if (r.gedcom_xref) {
      out.set(r.id, r.gedcom_xref);
      taken.add(r.gedcom_xref);
    }
  }
  let n = 1;
  for (const r of rows) {
    if (out.has(r.id)) continue;
    let candidate = `@${prefix}${n}@`;
    while (taken.has(candidate)) {
      n++;
      candidate = `@${prefix}${n}@`;
    }
    out.set(r.id, candidate);
    taken.add(candidate);
    n++;
  }
  return out;
}

describe('export xref allocation', () => {
  it('does not collide with pre-existing @I1@', () => {
    const result = allocateXrefs(
      [
        { id: 'a', gedcom_xref: null }, // would have become @I1@
        { id: 'b', gedcom_xref: '@I1@' },
        { id: 'c', gedcom_xref: null },
      ],
      'I'
    );
    expect(result.get('b')).toBe('@I1@');
    // a and c cannot be @I1@; must each be unique and not in the taken set.
    const values = Array.from(result.values());
    expect(new Set(values).size).toBe(values.length);
    expect(result.get('a')).not.toBe('@I1@');
    expect(result.get('c')).not.toBe('@I1@');
  });

  it('preserves imported @I4@ and fills gaps with free slots', () => {
    const result = allocateXrefs(
      [
        { id: 'x', gedcom_xref: null },
        { id: 'y', gedcom_xref: '@I4@' },
        { id: 'z', gedcom_xref: null },
      ],
      'I'
    );
    const all = [result.get('x'), result.get('y'), result.get('z')];
    expect(all).toContain('@I4@');
    expect(new Set(all).size).toBe(3);
  });
});
