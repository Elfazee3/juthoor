import { Suspense } from 'react';
import { loadTopSurnames } from '@/data/user/families-index';
import { FamiliesIndexClient } from './FamiliesIndexClient';

async function FamiliesContainer() {
  const rows = await loadTopSurnames(120);
  return <FamiliesIndexClient rows={rows} />;
}

export default function FamiliesPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center text-sm text-[var(--jt-stone-500)]">
          Loading families…
        </div>
      }
    >
      <FamiliesContainer />
    </Suspense>
  );
}
