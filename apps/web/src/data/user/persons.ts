'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { authActionClient } from '@/lib/safe-action';
import {
  genderUIEnum,
  personInputSchema,
} from '@/lib/tree/zodSchemas';
import { createJuthoorSupabaseClient } from '@/supabase-clients/juthoor-server';

/**
 * Insert a person atomically (person + primary person_names + optional
 * BIRT/DEAT events) via the `create_person_with_primary_name` RPC.
 * The RPC is SECURITY INVOKER — RLS enforces write-access to the tree.
 *
 * Display-name policy (FRS): for women we store the maiden form as
 * the displayed name. Married-name rows (`name_type='married'`) may be
 * added later via a separate mutation so they stay searchable but are
 * never picked as display.
 */
export const insertPersonAction = authActionClient
  .schema(personInputSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await createJuthoorSupabaseClient();

    const arDisplay =
      joinDisplay(parsedInput.arGivenName, parsedInput.arSurname) ?? null;
    const enDisplay =
      joinDisplay(parsedInput.enGivenName, parsedInput.enSurname) ?? null;

    // For women: always store under a maiden row type per FRS rule.
    // The client must pass maiden surname, NOT married. This keeps the
    // display policy honest at the data layer too.
    const nameType = parsedInput.gender === 'F' ? 'maiden' : 'birth';

    const { data, error } = await supabase.rpc(
      'create_person_with_primary_name',
      {
        p_tree_id: parsedInput.treeId,
        p_gender: parsedInput.gender,
        p_name_type: nameType,
        p_lang: parsedInput.arGivenName ? 'ar' : 'en',
        p_given_name:
          parsedInput.arGivenName ?? parsedInput.enGivenName ?? null,
        p_surname:
          parsedInput.arSurname ?? parsedInput.enSurname ?? null,
        p_display_name_ar: arDisplay,
        p_display_name_en: enDisplay,
        p_birth_year: parsedInput.birthYear ?? null,
        p_death_year: parsedInput.deathYear ?? null,
        p_place_of_origin_id: parsedInput.placeOfOriginId ?? null,
        p_is_placeholder: false,
      }
    );

    if (error) throw new Error(error.message);
    const row = Array.isArray(data) ? data[0] : data;

    revalidatePath('/tree');
    return { personId: row?.person_id as string };
  });

/**
 * Insert a placeholder "Female N" mother linked to a specific father.
 * Per the 2026-04-17 decision, N is scoped per-father (so each father
 * has his own Female 1, 2, ...). Numbering is derived from how many
 * placeholder spouses the father already has.
 */
const insertPlaceholderMotherSchema = z.object({
  treeId: z.string().uuid(),
  fatherId: z.string().uuid(),
});

export const insertPlaceholderMotherAction = authActionClient
  .schema(insertPlaceholderMotherSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await createJuthoorSupabaseClient();

    // Count existing placeholder spouses of this father.
    const { data: existingFamilies, error: famErr } = await supabase
      .from('families')
      .select('partner1_id, partner2_id')
      .eq('tree_id', parsedInput.treeId)
      .or(
        `partner1_id.eq.${parsedInput.fatherId},partner2_id.eq.${parsedInput.fatherId}`
      );

    if (famErr) throw new Error(famErr.message);

    const partnerIds = (existingFamilies ?? [])
      .map((f) =>
        f.partner1_id === parsedInput.fatherId ? f.partner2_id : f.partner1_id
      )
      .filter((id): id is string => Boolean(id));

    let placeholderCount = 0;
    if (partnerIds.length > 0) {
      const { data: partners } = await supabase
        .from('persons')
        .select('id, notes')
        .in('id', partnerIds);
      placeholderCount = (partners ?? []).filter(
        (p) => p.notes === 'placeholder'
      ).length;
    }

    const n = placeholderCount + 1;

    // Create the placeholder person (Female gender, name "Female N").
    const { data: rpcData, error: rpcErr } = await supabase.rpc(
      'create_person_with_primary_name',
      {
        p_tree_id: parsedInput.treeId,
        p_gender: 'F' as const,
        p_name_type: 'maiden',
        p_lang: 'en',
        p_given_name: `Female ${n}`,
        p_surname: null,
        p_display_name_ar: `أنثى ${n}`,
        p_display_name_en: `Female ${n}`,
        p_birth_year: null,
        p_death_year: null,
        p_place_of_origin_id: null,
        p_is_placeholder: true,
      }
    );
    if (rpcErr) throw new Error(rpcErr.message);
    const rpcRow = Array.isArray(rpcData) ? rpcData[0] : rpcData;
    const placeholderId = rpcRow?.person_id as string;

    // Link placeholder as partner of the father in a new family.
    const { data: famRow, error: createFamErr } = await supabase
      .from('families')
      .insert({
        tree_id: parsedInput.treeId,
        partner1_id: parsedInput.fatherId,
        partner2_id: placeholderId,
      })
      .select('id')
      .single();

    if (createFamErr) throw new Error(createFamErr.message);

    revalidatePath('/tree');
    return { placeholderId, familyId: famRow.id };
  });

/**
 * Upgrade a placeholder person (e.g. "Female 1") into a real one.
 *
 * FRS flow: when the mother's real details become known, the user
 * edits the placeholder in-place so existing family_children links
 * (and thus the children already attached to her) are preserved —
 * no re-parenting needed at the DB level. The caller then surfaces
 * the affected children in a confirmation dialog so the user can
 * review (and unlink any that shouldn't actually belong to her).
 */
const CURRENT_YEAR = new Date().getUTCFullYear();
const yearSchema = z
  .number()
  .int()
  .gte(1000)
  .lte(CURRENT_YEAR);

const upgradePlaceholderPersonSchema = z
  .object({
    placeholderId: z.string().uuid(),
    treeId: z.string().uuid(),
    arGivenName: z.string().trim().min(1).max(100).optional(),
    arSurname: z.string().trim().max(100).optional(),
    enGivenName: z.string().trim().min(1).max(100).optional(),
    enSurname: z.string().trim().max(100).optional(),
    gender: genderUIEnum,
    birthYear: yearSchema.optional(),
    deathYear: yearSchema.optional(),
    placeOfOriginId: z.string().uuid().optional(),
    notes: z.string().max(5000).optional(),
  })
  .refine(
    (input) => Boolean(input.arGivenName) || Boolean(input.enGivenName),
    { message: 'At least one given name is required', path: ['arGivenName'] }
  )
  .refine(
    (input) =>
      input.birthYear === undefined ||
      input.deathYear === undefined ||
      input.deathYear >= input.birthYear,
    { message: 'Death year cannot be before birth year', path: ['deathYear'] }
  );

export const upgradePlaceholderPersonAction = authActionClient
  .schema(upgradePlaceholderPersonSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await createJuthoorSupabaseClient();

    // Sanity: the row must actually be a placeholder before we upgrade.
    const { data: current, error: loadErr } = await supabase
      .from('persons')
      .select('id, notes, tree_id')
      .eq('id', parsedInput.placeholderId)
      .maybeSingle();

    if (loadErr) throw new Error(loadErr.message);
    if (!current) throw new Error('Placeholder person not found');
    if (current.notes !== 'placeholder') {
      throw new Error('Only placeholder persons can be upgraded');
    }
    if (current.tree_id !== parsedInput.treeId) {
      throw new Error('Tree mismatch');
    }

    const arDisplay =
      joinDisplay(parsedInput.arGivenName, parsedInput.arSurname) ?? null;
    const enDisplay =
      joinDisplay(parsedInput.enGivenName, parsedInput.enSurname) ?? null;

    const { error: updateErr } = await supabase
      .from('persons')
      .update({
        gender: parsedInput.gender,
        display_name_ar: arDisplay,
        display_name_en: enDisplay,
        birth_year: parsedInput.birthYear ?? null,
        death_year: parsedInput.deathYear ?? null,
        place_of_origin_id: parsedInput.placeOfOriginId ?? null,
        notes: parsedInput.notes ?? null, // clears the 'placeholder' tag
      })
      .eq('id', parsedInput.placeholderId);

    if (updateErr) throw new Error(updateErr.message);

    // Replace the primary person_names row with the real name.
    const nameType = parsedInput.gender === 'F' ? 'maiden' : 'birth';
    const { error: nameErr } = await supabase
      .from('person_names')
      .update({
        given_name: parsedInput.arGivenName ?? parsedInput.enGivenName ?? null,
        surname: parsedInput.arSurname ?? parsedInput.enSurname ?? null,
        lang: parsedInput.arGivenName ? 'ar' : 'en',
        name_type: nameType,
      })
      .eq('person_id', parsedInput.placeholderId)
      .eq('is_primary', true);

    if (nameErr) throw new Error(nameErr.message);

    // Find children currently linked to this (now-upgraded) person so
    // the UI can offer a confirmation/unlink step.
    const { data: fams, error: famsErr } = await supabase
      .from('families')
      .select('id')
      .eq('tree_id', parsedInput.treeId)
      .or(
        `partner1_id.eq.${parsedInput.placeholderId},partner2_id.eq.${parsedInput.placeholderId}`
      );

    if (famsErr) throw new Error(famsErr.message);
    const familyIds = (fams ?? []).map((f) => f.id);

    const affectedChildren: { id: string; familyId: string }[] = [];
    if (familyIds.length > 0) {
      const { data: links, error: linksErr } = await supabase
        .from('family_children')
        .select('child_id, family_id')
        .in('family_id', familyIds);

      if (linksErr) throw new Error(linksErr.message);
      for (const l of links ?? []) {
        affectedChildren.push({ id: l.child_id, familyId: l.family_id });
      }
    }

    revalidatePath('/tree');
    return {
      personId: parsedInput.placeholderId,
      affectedChildren,
    };
  });

const deletePersonSchema = z.object({ id: z.string().uuid() });

export const deletePersonAction = authActionClient
  .schema(deletePersonSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await createJuthoorSupabaseClient();
    const { error } = await supabase
      .from('persons')
      .delete()
      .eq('id', parsedInput.id);

    if (error) throw new Error(error.message);
    revalidatePath('/tree');
    return { success: true };
  });

function joinDisplay(
  given: string | undefined,
  surname: string | undefined
): string | null {
  const g = given?.trim();
  const s = surname?.trim();
  if (g && s) return `${g} ${s}`;
  if (g) return g;
  if (s) return s;
  return null;
}
