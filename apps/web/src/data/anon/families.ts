'use server';

import { createJuthoorSupabaseClient } from '@/supabase-clients/juthoor-server';
import type { Family, FamilyChild } from '@/types/database';

export async function getTreeFamilies(
  treeId: string
): Promise<readonly Family[]> {
  const supabase = await createJuthoorSupabaseClient();
  const { data, error } = await supabase
    .from('families')
    .select('*')
    .eq('tree_id', treeId);

  if (error) throw new Error(`Failed to load families: ${error.message}`);
  return data ?? [];
}

export async function getTreeFamilyChildren(
  treeId: string
): Promise<readonly FamilyChild[]> {
  const supabase = await createJuthoorSupabaseClient();

  // family_children has no tree_id; join through families to scope by tree.
  // Using a single query with inner join keeps this one round-trip.
  const { data, error } = await supabase
    .from('family_children')
    .select('*, families!inner(tree_id)')
    .eq('families.tree_id', treeId);

  if (error)
    throw new Error(`Failed to load family children: ${error.message}`);

  // Strip the joined `families` column — we only wanted the filter.
  return (data ?? []).map(({ families: _omit, ...row }) => row as FamilyChild);
}
