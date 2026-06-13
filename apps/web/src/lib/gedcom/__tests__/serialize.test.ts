import { describe, expect, it } from 'vitest';

import { parseGedcom } from '../parse';
import { serializeGedcom } from '../serialize';
import type { GedcomSnapshot } from '../types';
import {
  ARABIC_UTF8_GEDCOM,
  MINIMAL_GEDCOM,
  MULTI_SPOUSE_GEDCOM,
} from './fixtures';

describe('serializeGedcom — round-trip', () => {
  function roundTrip(raw: string): GedcomSnapshot {
    const parsed = parseGedcom(raw);
    const serialized = serializeGedcom(parsed);
    return parseGedcom(serialized);
  }

  it('round-trips the minimal fixture with no loss of core fields', () => {
    const original = parseGedcom(MINIMAL_GEDCOM);
    const rt = roundTrip(MINIMAL_GEDCOM);

    expect(rt.persons).toHaveLength(original.persons.length);
    expect(rt.families).toHaveLength(original.families.length);

    const ahmad = rt.persons.find((p) => p.xref === '@I1@')!;
    expect(ahmad.gender).toBe('M');
    expect(ahmad.names[0].given).toBe('Ahmad');
    expect(ahmad.names[0].surname).toBe('Bouz');
    expect(ahmad.events.find((e) => e.eventType === 'BIRT')?.year).toBe(1920);

    const fam = rt.families[0];
    expect(fam.xref).toBe('@F1@');
    expect(fam.husbandXref).toBe('@I1@');
    expect(fam.wifeXref).toBe('@I2@');
    expect(fam.children.map((c) => c.childXref)).toEqual(['@I3@']);
  });

  it('round-trips a multi-spouse file preserving both FAM records', () => {
    const rt = roundTrip(MULTI_SPOUSE_GEDCOM);
    expect(rt.families).toHaveLength(2);
    expect(rt.families.every((f) => f.husbandXref === '@I1@')).toBe(true);
  });

  it('round-trips Arabic UTF-8 names', () => {
    const rt = roundTrip(ARABIC_UTF8_GEDCOM);
    const ahmad = rt.persons[0];
    expect(ahmad.names[0].given).toBe('أحمد');
    expect(ahmad.names[0].surname).toBe('البوز');
  });
});

describe('serializeGedcom — output format', () => {
  it('starts with 0 HEAD and ends with 0 TRLR', () => {
    const parsed = parseGedcom(MINIMAL_GEDCOM);
    const out = serializeGedcom(parsed);
    expect(out.split('\n')[0]).toMatch(/^0 HEAD$/);
    // TRLR must be the last non-empty line.
    const nonEmpty = out.trim().split('\n');
    expect(nonEmpty[nonEmpty.length - 1]).toMatch(/^0 TRLR$/);
  });

  it('uses CRLF-safe line separator: every line terminated by \\n', () => {
    const parsed = parseGedcom(MINIMAL_GEDCOM);
    const out = serializeGedcom(parsed);
    // All lines end with \n; no \r\n pairs (we emit LF-only, consumers handle both).
    expect(out.includes('\r')).toBe(false);
  });
});
