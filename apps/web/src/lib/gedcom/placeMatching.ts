/**
 * Match free-text GEDCOM PLAC strings to rows in the `places` table.
 *
 * Strategy (cheapest first):
 *   1. Case-insensitive exact match on `name_en` or `name_ar`.
 *   2. Substring match (Jerusalem, Al-Quds, القدس all include the
 *      same base token somewhere).
 *   3. Nothing matches → return null; the caller stores the raw
 *      string in `events.place_name` so nothing is lost.
 *
 * GEDCOM PLAC is often a comma-separated hierarchy
 * ("Jerusalem, Palestine"). We only match on the first segment.
 */

import type { Place } from '@/types/database';

export interface PlaceMatch {
  readonly placeId: string | null;
  readonly rawName: string;
}

export function matchPlace(
  rawPlace: string | undefined,
  places: readonly Pick<Place, 'id' | 'name_ar' | 'name_en'>[]
): PlaceMatch {
  if (!rawPlace) return { placeId: null, rawName: '' };

  const head = rawPlace.split(',')[0]?.trim() ?? '';
  if (head.length === 0) return { placeId: null, rawName: rawPlace };

  const lower = head.toLowerCase();

  // 1. Exact (case-insensitive for Latin; Arabic compared as-is).
  const exact = places.find(
    (p) =>
      p.name_en?.toLowerCase() === lower ||
      p.name_ar === head
  );
  if (exact) return { placeId: exact.id, rawName: rawPlace };

  // 2. Substring.
  const substring = places.find(
    (p) =>
      (p.name_en && p.name_en.toLowerCase().includes(lower)) ||
      (p.name_ar && p.name_ar.includes(head))
  );
  if (substring) return { placeId: substring.id, rawName: rawPlace };

  return { placeId: null, rawName: rawPlace };
}
