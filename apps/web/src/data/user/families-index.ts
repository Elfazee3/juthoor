'use server';

import { createJuthoorSupabaseClient } from '@/supabase-clients/juthoor-server';

export type FamilyIndexRow = {
  surname: string;
  count: number;
  is_arabic: boolean;
};

/**
 * Top surnames across all visible trees. Aggregates `person_names` —
 * RLS keeps the result limited to public + accessible trees.
 */
export async function loadTopSurnames(limit = 60): Promise<FamilyIndexRow[]> {
  const supabase = await createJuthoorSupabaseClient();
  const { data, error } = await supabase
    .from('person_names')
    .select('surname')
    .not('surname', 'is', null)
    .limit(2000);
  if (error) throw new Error(`Failed to load surnames: ${error.message}`);

  const tally = new Map<string, number>();
  for (const r of (data ?? []) as Array<{ surname: string | null }>) {
    const s = (r.surname ?? '').trim();
    if (!s) continue;
    tally.set(s, (tally.get(s) ?? 0) + 1);
  }
  const rows = Array.from(tally.entries())
    .map(([surname, count]) => ({
      surname,
      count,
      is_arabic: /[؀-ۿ]/.test(surname),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
  return rows;
}
