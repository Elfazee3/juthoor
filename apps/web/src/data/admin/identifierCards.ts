'use server';

import { z } from 'zod';
import { createJuthoorSupabaseClient } from '@/supabase-clients/juthoor-server';
import { requireAdmin } from '@/data/admin/requireAdmin';

export type IdentifierKind = 'unrwa_card' | 'family_card_1948';

export type IdentifierCardRequest = {
  personId: string;
  kind: IdentifierKind;
  treeName: string | null;
  personName: string | null;
  number: string;
  attachmentId: string;
  uploadedAt: string;
  /** Short-lived link to the card copy, or null when it cannot be opened. */
  copyUrl: string | null;
};

const BUCKET = 'person-attachments';
const KindSchema = z.enum(['unrwa_card', 'family_card_1948']);
const VerifySchema = z.object({
  personId: z.string().uuid(),
  kind: KindSchema,
  attachmentId: z.string().uuid(),
});
const RejectSchema = z.object({ personId: z.string().uuid(), kind: KindSchema });

/**
 * Platform Administrator (D9): UNRWA and 1948 family-card numbers waiting to be checked against
 * the attached card copy. Only a checked number can link two people (D8).
 */
export async function listIdentifierCardRequests(): Promise<IdentifierCardRequest[]> {
  await requireAdmin();
  const supabase = await createJuthoorSupabaseClient();
  const { data, error } = await supabase.rpc('list_identifier_queue');
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  return Promise.all(
    rows.map(async (r) => {
      const signed = await supabase.storage.from(BUCKET).createSignedUrl(r.storage_path, 600);
      return {
        personId: r.person_id,
        kind: r.kind,
        treeName: r.tree_name,
        personName: r.person_name,
        number: r.value,
        attachmentId: r.attachment_id,
        uploadedAt: r.uploaded_at,
        copyUrl: signed.data?.signedUrl ?? null,
      };
    }),
  );
}

/** The number on the card matches the number entered: it can now link people. */
export async function verifyIdentifierCard(input: z.input<typeof VerifySchema>): Promise<void> {
  const parsed = VerifySchema.parse(input);
  await requireAdmin();
  const supabase = await createJuthoorSupabaseClient();
  const { error } = await supabase.rpc('verify_identifier', {
    p_person: parsed.personId,
    p_kind: parsed.kind,
    p_attachment: parsed.attachmentId,
  });
  if (error) throw new Error(error.message);
}

/** The card does not match or cannot be read: the number stays unverified until it changes. */
export async function rejectIdentifierCard(input: z.input<typeof RejectSchema>): Promise<void> {
  const parsed = RejectSchema.parse(input);
  await requireAdmin();
  const supabase = await createJuthoorSupabaseClient();
  const { error } = await supabase.rpc('reject_identifier', {
    p_person: parsed.personId,
    p_kind: parsed.kind,
  });
  if (error) throw new Error(error.message);
}
