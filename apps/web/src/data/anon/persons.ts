'use server';

import { createJuthoorSupabaseClient } from '@/supabase-clients/juthoor-server';
import type { Person, PersonName } from '@/types/database';

/** All persons in a tree — used to seed the client-side solver. */
export async function getTreePersons(
  treeId: string
): Promise<readonly Person[]> {
  const supabase = await createJuthoorSupabaseClient();
  const { data, error } = await supabase
    .from('persons')
    .select('*')
    .eq('tree_id', treeId)
    // Stable order: first-created person (usually "self") comes first,
    // which the tree page uses as the default chart root.
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to load persons: ${error.message}`);
  return data ?? [];
}

export async function getPerson(id: string): Promise<Person | null> {
  const supabase = await createJuthoorSupabaseClient();
  const { data, error } = await supabase
    .from('persons')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`Failed to load person ${id}: ${error.message}`);
  return data ?? null;
}

/** Batch fetch for hover-cards & 360° neighbour rendering. */
export async function getPersonsByIds(
  ids: readonly string[]
): Promise<readonly Person[]> {
  if (ids.length === 0) return [];
  const supabase = await createJuthoorSupabaseClient();
  const { data, error } = await supabase
    .from('persons')
    .select('*')
    .in('id', ids as string[]);

  if (error) throw new Error(`Failed to load persons: ${error.message}`);
  return data ?? [];
}

export async function getPersonNames(
  personId: string
): Promise<readonly PersonName[]> {
  const supabase = await createJuthoorSupabaseClient();
  const { data, error } = await supabase
    .from('person_names')
    .select('*')
    .eq('person_id', personId)
    .order('is_primary', { ascending: false });

  if (error) throw new Error(`Failed to load names: ${error.message}`);
  return data ?? [];
}
