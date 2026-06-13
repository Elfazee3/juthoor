/**
 * Internal person-creation helpers shared by the person/relative server
 * actions. NOT a 'use server' module — these are plain functions that
 * receive an already-authenticated Supabase client from the caller.
 */

import type { PersonInput } from '@/lib/tree/zodSchemas';
import type { createJuthoorSupabaseClient } from '@/supabase-clients/juthoor-server';

export type SupabaseServerClient = Awaited<
  ReturnType<typeof createJuthoorSupabaseClient>
>;

export function blankToUndefined(
  value: string | undefined
): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function joinDisplay(
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

/**
 * Map raw Postgres/RLS error text to a message the (Arabic-first) UI can
 * show as-is. Falls back to the original message so real diagnostics are
 * never swallowed.
 */
export function toUserFacingDbError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('row-level security') || lower.includes('permission')) {
    return 'ليست لديك صلاحية التعديل على هذه الشجرة.';
  }
  if (lower.includes('not authenticated') || lower.includes('jwt')) {
    return 'انتهت الجلسة — يرجى تسجيل الدخول من جديد.';
  }
  if (lower.includes('duplicate key')) {
    return 'هذا الرابط مسجّل بالفعل.';
  }
  return message;
}

/**
 * Create a person atomically (person + primary name + optional BIRT/DEAT
 * events) via the `create_person_with_primary_name` RPC and return the
 * new person id. SECURITY INVOKER — RLS enforces tree write access.
 *
 * Display-name policy (FRS): women are stored under a maiden name row so
 * married names never become the displayed name.
 */
export async function createPersonWithPrimaryName(
  supabase: SupabaseServerClient,
  input: PersonInput,
  opts: { readonly isPlaceholder?: boolean } = {}
): Promise<string> {
  // Controlled inputs submit '' for untouched fields — normalize blanks
  // to undefined here, the single boundary where person data hits the DB.
  const arGiven = blankToUndefined(input.arGivenName);
  const arSurname = blankToUndefined(input.arSurname);
  const enGiven = blankToUndefined(input.enGivenName);
  const enSurname = blankToUndefined(input.enSurname);

  const arDisplay = joinDisplay(arGiven, arSurname);
  const enDisplay = joinDisplay(enGiven, enSurname);
  const nameType = input.gender === 'F' ? 'maiden' : 'birth';

  const { data, error } = await supabase.rpc(
    'create_person_with_primary_name',
    {
      p_tree_id: input.treeId,
      p_gender: input.gender,
      p_name_type: nameType,
      p_lang: arGiven ? 'ar' : 'en',
      p_given_name: arGiven ?? enGiven ?? null,
      p_surname: arSurname ?? enSurname ?? null,
      p_display_name_ar: arDisplay,
      p_display_name_en: enDisplay,
      p_birth_year: input.birthYear ?? null,
      p_death_year: input.deathYear ?? null,
      p_place_of_origin_id: input.placeOfOriginId ?? null,
      p_is_placeholder: opts.isPlaceholder ?? false,
    }
  );

  if (error) throw new Error(toUserFacingDbError(error.message));
  const row = Array.isArray(data) ? data[0] : data;
  const personId = row?.person_id as string | undefined;
  if (!personId) {
    throw new Error('لم يتم إنشاء الشخص — لم يُرجِع الخادم معرّفًا.');
  }
  return personId;
}
