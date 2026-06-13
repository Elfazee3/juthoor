'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { authActionClient } from '@/lib/safe-action';
import { treeInputSchema } from '@/lib/tree/zodSchemas';
import { createJuthoorSupabaseClient } from '@/supabase-clients/juthoor-server';

/**
 * Create a tree owned by the authenticated user. The DB trigger
 * auto-creates a corresponding `tree_members` row with role='owner'.
 */
export const insertTreeAction = authActionClient
  .schema(treeInputSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createJuthoorSupabaseClient();
    const { data, error } = await supabase
      .from('trees')
      .insert({
        name: parsedInput.name,
        description: parsedInput.description ?? null,
        owner_id: ctx.userId,
        is_public: parsedInput.isPublic,
      })
      .select('id')
      .single();

    if (error) throw new Error(error.message);

    revalidatePath('/tree');
    return { id: data.id };
  });

/**
 * Ensure the user has at least one tree; return the first one.
 * Called on first `/tree` visit to realise the "auto-create default
 * tree" decision (2026-04-17).
 */
export const ensureDefaultTreeAction = authActionClient
  .schema(z.object({}))
  .action(async ({ ctx }) => {
    const supabase = await createJuthoorSupabaseClient();

    const { data: existing, error: readErr } = await supabase
      .from('trees')
      .select('id')
      .eq('owner_id', ctx.userId)
      .order('created_at', { ascending: true })
      .limit(1);

    if (readErr) throw new Error(readErr.message);
    if (existing && existing.length > 0) {
      return { id: existing[0].id, created: false };
    }

    const { data: created, error: createErr } = await supabase
      .from('trees')
      .insert({
        name: 'شجرة عائلتي', // "My Family Tree"
        owner_id: ctx.userId,
        is_public: false,
      })
      .select('id')
      .single();

    if (createErr) throw new Error(createErr.message);

    revalidatePath('/tree');
    return { id: created.id, created: true };
  });

const deleteTreeSchema = z.object({ id: z.string().uuid() });

export const deleteTreeAction = authActionClient
  .schema(deleteTreeSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await createJuthoorSupabaseClient();
    const { error } = await supabase
      .from('trees')
      .delete()
      .eq('id', parsedInput.id);

    if (error) throw new Error(error.message);

    revalidatePath('/tree');
    return { success: true };
  });
