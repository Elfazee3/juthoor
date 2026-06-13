import { Suspense } from 'react';
import { HomeClient } from './HomeClient';
import { createJuthoorSupabaseClient } from '@/supabase-clients/juthoor-server';

type Village = { id: string; name_ar: string; name_en: string | null; district_ar: string | null };

async function VillagesHome() {
  let villages: Village[] = [];
  try {
    const supabase = await createJuthoorSupabaseClient();
    const { data } = await supabase
      .from('places')
      .select('id, name_ar, name_en, district_ar')
      .not('depopulated_year', 'is', null)
      .limit(28);
    villages = (data as Village[] | null) ?? [];
  } catch {
    villages = [];
  }
  return <HomeClient villages={villages} />;
}

export default function HomePage() {
  return (
    <Suspense fallback={<HomeClient villages={[]} />}>
      <VillagesHome />
    </Suspense>
  );
}
