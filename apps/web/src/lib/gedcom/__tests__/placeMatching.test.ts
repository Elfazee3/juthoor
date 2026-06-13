import { describe, expect, it } from 'vitest';

import { matchPlace } from '../placeMatching';

const fixturePlaces = [
  {
    id: 'p-jerusalem',
    name_ar: 'القدس',
    name_en: 'Jerusalem',
  },
  {
    id: 'p-haifa',
    name_ar: 'حيفا',
    name_en: 'Haifa',
  },
];

describe('matchPlace', () => {
  it('matches English exact name', () => {
    const r = matchPlace('Jerusalem', fixturePlaces);
    expect(r.placeId).toBe('p-jerusalem');
  });

  it('matches Arabic exact name', () => {
    const r = matchPlace('القدس', fixturePlaces);
    expect(r.placeId).toBe('p-jerusalem');
  });

  it('matches only the first segment of a GEDCOM hierarchy', () => {
    const r = matchPlace('Jerusalem, Palestine', fixturePlaces);
    expect(r.placeId).toBe('p-jerusalem');
  });

  it('returns null when nothing matches, preserving rawName', () => {
    const r = matchPlace('Lahore, Pakistan', fixturePlaces);
    expect(r.placeId).toBeNull();
    expect(r.rawName).toBe('Lahore, Pakistan');
  });

  it('handles empty input gracefully', () => {
    const r = matchPlace(undefined, fixturePlaces);
    expect(r.placeId).toBeNull();
  });
});
