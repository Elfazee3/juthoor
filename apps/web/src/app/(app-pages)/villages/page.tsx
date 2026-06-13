import { Suspense } from 'react';
import { loadAllPlaces, loadPlaceTypeCounts } from '@/data/user/places';
import { VillagesClient } from './VillagesClient';

async function VillagesContainer() {
  const [places, counts] = await Promise.all([loadAllPlaces(), loadPlaceTypeCounts()]);
  return <VillagesClient places={places} counts={counts} />;
}

export default function VillagesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-[var(--jt-stone-500)]">
          Loading places…
        </div>
      }
    >
      <VillagesContainer />
    </Suspense>
  );
}
