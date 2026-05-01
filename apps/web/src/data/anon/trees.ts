'use server';

import { getLoggedInUserId } from '@/data/user/user';
import { createJuthoorSupabaseClient } from '@/supabase-clients/juthoor-server';
import type { Tree, TreeMember } from '@/types/database';

/**
 * Ensure the authenticated user has a default tree. Returns the tree id
 * of the first tree they own (creates one if none exist). Throws when
 * the user is not logged in — callers in RSC pages should catch and
 * redirect to /login.
 *
 * Called during render of the /tree page, so it deliberately avoids
 * `revalidatePath` (which Next 16 rejects inside render).
 */
export async function ensureUserHasDefaultTree(): Promise<string | null> {
  const userId = await getLoggedInUserId();
  const supabase = await createJuthoorSupabaseClient();

  const { data: existing, error: readErr } = await supabase
    .from('trees')
    .select('id')
    .eq('owner_id', userId)
    .order('created_at', { ascending: true })
    .limit(1);

  if (readErr) throw new Error(readErr.message);
  if (existing && existing.length > 0) return existing[0].id;

  const { data: created, error: createErr } = await supabase
    .from('trees')
    .insert({
      name: 'شجرة عائلتي',
      owner_id: userId,
      is_public: false,
    })
    .select('id')
    .single();

  if (createErr) throw new Error(createErr.message);
  return created.id;
}

/**
 * Trees the currently-authenticated user can read (owned or shared via
 * tree_members, or any public tree). RLS enforces access; we just
 * select * and trust the policies.
 */
export async function getUserTrees(): Promise<readonly Tree[]> {
  const supabase = await createJuthoorSupabaseClient();
  const { data, error } = await supabase
    .from('trees')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Failed to load trees: ${error.message}`);
  return data ?? [];
}

export async function getTreeById(id: string): Promise<Tree | null> {
  const supabase = await createJuthoorSupabaseClient();
  const { data, error } = await supabase
    .from('trees')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`Failed to load tree ${id}: ${error.message}`);
  return data ?? null;
}

/**
 * All tree_members rows for a given tree (owner + collaborators).
 * Useful for the sharing UI in Phase 2.
 */
export async function getTreeMembers(
  treeId: string
): Promise<readonly TreeMember[]> {
  const supabase = await createJuthoorSupabaseClient();
  const { data, error } = await supabase
    .from('tree_members')
    .select('*')
    .eq('tree_id', treeId);

  if (error)
    throw new Error(`Failed to load tree members: ${error.message}`);
  return data ?? [];
}
