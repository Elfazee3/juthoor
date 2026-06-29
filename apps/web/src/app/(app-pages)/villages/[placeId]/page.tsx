import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import {
  loadPlaceById,
  loadPlaceProfile,
  loadPlaceMedia,
  loadPersonsFromPlace,
  loadSurnamesFromPlace,
} from '@/data/user/places';
import { VillageDetailClient } from './VillageDetailClient';

async function VillageDetailContainer({ placeId }: { placeId: string }) {
  const place = await loadPlaceById(placeId);
  if (!place) notFound();
  const [persons, surnames, profile, media] = await Promise.all([
    loadPersonsFromPlace(placeId).catch(() => []),
    loadSurnamesFromPlace(placeId).catch(() => []),
    loadPlaceProfile(placeId).catch(() => null),
    loadPlaceMedia(placeId).catch(() => ({ gallery: [], documents: [] })),
  ]);
  return (
    <VillageDetailClient
      place={place}
      persons={persons}
      surnames={surnames}
      profile={profile}
      media={media}
    />
  );
}

export default async function VillageDetailPage({
  params,
}: {
  params: Promise<{ placeId: string }>;
}) {
  const { placeId } = await params;
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-[var(--jt-stone-500)]">
          Loading place…
        </div>
      }
    >
      <VillageDetailContainer placeId={placeId} />
    </Suspense>
  );
}
