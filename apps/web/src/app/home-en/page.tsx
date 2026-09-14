import { Suspense } from 'react';
import { HomeEnClient } from './HomeEnClient';
import { createJuthoorSupabaseClient } from '@/supabase-clients/juthoor-server';

type Village = { id: string; name_ar: string; name_en: string | null; district_ar: string | null };

export const metadata = {
  title: 'Palestinian Roots Platform | Juthoor — English Preview',
  description:
    'One family tree for all Palestinians, everywhere. Preview of a bilingual, Appendix-2-structured homepage for the Palestinian Roots Platform.',
};

async function VillagesHomeEn() {
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
  return <HomeEnClient villages={villages} />;
}

export default function HomeEnPreviewPage() {
  return (
    <Suspense fallback={<HomeEnClient villages={[]} />}>
      <VillagesHomeEn />
    </Suspense>
  );
}
