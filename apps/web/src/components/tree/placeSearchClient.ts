'use client';

import { searchPlaces } from '@/data/anon/places';

/**
 * Thin client wrapper around the server `searchPlaces` helper. Keeps
 * the PlaceCombobox component file free of server-action imports,
 * which simplifies bundling.
 */
export async function searchPlacesClient(query: string) {
  return searchPlaces(query);
}
