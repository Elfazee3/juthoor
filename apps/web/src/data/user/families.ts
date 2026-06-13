'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { authActionClient } from '@/lib/safe-action';
import {
  childLinkSchema,
  createChildLinkWithPartnersSchema,
  familyInputSchema,
} from '@/lib/tree/zodSchemas';
import { createJuthoorSupabaseClient } from '@/supabase-clients/juthoor-server';

/**
 * Upsert a family (spouse union). Partners must be gendered
 * appropriately at the UI layer (father/mother labels) but the DB
 * stores them gender-neutral as partner1/partner2.
 */
export const upsertFamilyAction = authActionClient
  .schema(
    familyInputSchema.extend({ id: z.string().uuid().optional() })
  )
  .action(async ({ parsedInput }) => {
    const supabase = await createJuthoorSupabaseClient();

    if (parsedInput.id) {
      const { data, error } = await supabase
        .from('families')
        .update({
          partner1_id: parsedInput.partner1Id ?? null,
          partner2_id: parsedInput.partner2Id ?? null,
          notes: parsedInput.notes ?? null,
        })
        .eq('id', parsedInput.id)
        .select('id')
        .single();

      if (error) throw new Error(error.message);
      revalidatePath('/tree');
      return { id: data.id };
    }

    const { data, error } = await supabase
      .from('families')
      .insert({
        tree_id: parsedInput.treeId,
        partner1_id: parsedInput.partner1Id ?? null,
        partner2_id: parsedInput.partner2Id ?? null,
        notes: parsedInput.notes ?? null,
      })
      .select('id')
      .single();

    if (error) throw new Error(error.message);
    revalidatePath('/tree');
    return { id: data.id };
  });

/**
 * Link a child to the family of (fatherId, motherId). Enforces FRS
 * rule 11 via the zod schema (motherId required). If the matching
 * family row does not yet exist it is created.
 */
export const addChildAction = authActionClient
  .schema(
    childLinkSchema.extend({ treeId: z.string().uuid() })
  )
  .action(async ({ parsedInput }) => {
    const supabase = await createJuthoorSupabaseClient();

    // Multi-spouse validator (FRS): if the father already has recorded
    // partners, motherId must be one of them. Otherwise bootstrap.
    const { data: fatherFams, error: partnersErr } = await supabase
      .from('families')
      .select('partner1_id, partner2_id')
      .eq('tree_id', parsedInput.treeId)
      .or(
        `partner1_id.eq.${parsedInput.fatherId},partner2_id.eq.${parsedInput.fatherId}`
      );

    if (partnersErr) throw new Error(partnersErr.message);

    const knownPartnerIds = (fatherFams ?? [])
      .map((f) =>
        f.partner1_id === parsedInput.fatherId
          ? f.partner2_id
          : f.partner1_id
      )
      .filter((id): id is string => Boolean(id));

    const strictSchema = createChildLinkWithPartnersSchema(knownPartnerIds);
    const strictCheck = strictSchema.safeParse({
      childId: parsedInput.childId,
      fatherId: parsedInput.fatherId,
      motherId: parsedInput.motherId,
      pedigree: parsedInput.pedigree,
      birthOrder: parsedInput.birthOrder,
    });
    if (!strictCheck.success) {
      throw new Error(
        strictCheck.error.issues[0]?.message ??
          'Invalid child-to-family link'
      );
    }

    // Find or create the family linking father + mother.
    const { data: fams, error: findErr } = await supabase
      .from('families')
      .select('id')
      .eq('tree_id', parsedInput.treeId)
      .or(
        `and(partner1_id.eq.${parsedInput.fatherId},partner2_id.eq.${parsedInput.motherId}),and(partner1_id.eq.${parsedInput.motherId},partner2_id.eq.${parsedInput.fatherId})`
      )
      .limit(1);

    if (findErr) throw new Error(findErr.message);

    let familyId: string;
    if (fams && fams.length > 0) {
      familyId = fams[0].id;
    } else {
      const { data: created, error: createErr } = await supabase
        .from('families')
        .insert({
          tree_id: parsedInput.treeId,
          partner1_id: parsedInput.fatherId,
          partner2_id: parsedInput.motherId,
        })
        .select('id')
        .single();
      if (createErr) throw new Error(createErr.message);
      familyId = created.id;
    }

    const { data, error } = await supabase
      .from('family_children')
      .insert({
        family_id: familyId,
        child_id: parsedInput.childId,
        pedigree: parsedInput.pedigree,
        birth_order: parsedInput.birthOrder ?? null,
      })
      .select('id')
      .single();

    if (error) throw new Error(error.message);
    revalidatePath('/tree');
    return { id: data.id, familyId };
  });

const removeChildSchema = z.object({
  familyId: z.string().uuid(),
  childId: z.string().uuid(),
});

export const removeChildAction = authActionClient
  .schema(removeChildSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await createJuthoorSupabaseClient();
    const { error } = await supabase
      .from('family_children')
      .delete()
      .eq('family_id', parsedInput.familyId)
      .eq('child_id', parsedInput.childId);

    if (error) throw new Error(error.message);
    revalidatePath('/tree');
    return { success: true };
  });
