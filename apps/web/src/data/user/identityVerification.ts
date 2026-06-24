'use server';

import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { createJuthoorSupabaseClient } from '@/supabase-clients/juthoor-server';

const BUCKET = 'verification-docs';
const ALLOWED_EXT = /^(jpg|jpeg|png|webp|heic|pdf)$/i;

export type VerificationStatus = 'pending' | 'approved' | 'rejected';
export type IdDocumentType = 'passport' | 'national_id' | 'refugee_card' | 'other';

export type IdentityVerification = {
  id: string;
  user_id: string;
  tree_id: string | null;
  id_document_path: string;
  id_document_type: IdDocumentType;
  family_evidence_path: string | null;
  family_evidence_note: string | null;
  status: VerificationStatus;
  reviewer_note: string | null;
  reviewed_at: string | null;
  created_at: string;
};

export type PendingVerification = IdentityVerification & {
  submitter_name: string | null;
  id_document_url: string | null;
  family_evidence_url: string | null;
};

const SELECT_COLS =
  'id, user_id, tree_id, id_document_path, id_document_type, family_evidence_path, family_evidence_note, status, reviewer_note, reviewed_at, created_at';

/** Server-signed upload URL into the user's private folder in verification-docs.
 *  Path `{uid}/{uuid}.{ext}` lets the storage RLS gate ownership by folder. */
export async function getVerificationUploadTarget(input: {
  fileExtension: string;
}): Promise<{ path: string; token: string }> {
  const ext = input.fileExtension.replace(/^\./, '').toLowerCase();
  if (!ALLOWED_EXT.test(ext)) throw new Error(`Unsupported file type: ${ext}`);
  const supabase = await createJuthoorSupabaseClient();
  const { data: authData } = await supabase.auth.getUser();
  const uid = authData.user?.id;
  if (!uid) throw new Error('Not authenticated');
  const path = `${uid}/${randomUUID()}.${ext}`;
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);
  if (error) throw new Error(error.message);
  return { path, token: data.token };
}

const SubmitSchema = z.object({
  idDocumentPath: z.string().min(1),
  idDocumentType: z.enum(['passport', 'national_id', 'refugee_card', 'other']),
  familyEvidencePath: z.string().min(1).optional(),
  familyEvidenceNote: z.string().trim().max(2000).optional(),
  treeId: z.string().uuid().optional(),
});

export async function submitVerification(
  input: z.input<typeof SubmitSchema>,
): Promise<IdentityVerification> {
  const parsed = SubmitSchema.parse(input);
  const supabase = await createJuthoorSupabaseClient();
  const { data: authData } = await supabase.auth.getUser();
  const uid = authData.user?.id;
  if (!uid) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('identity_verifications')
    .insert({
      user_id: uid,
      tree_id: parsed.treeId ?? null,
      id_document_path: parsed.idDocumentPath,
      id_document_type: parsed.idDocumentType,
      family_evidence_path: parsed.familyEvidencePath ?? null,
      family_evidence_note: parsed.familyEvidenceNote?.trim() || null,
    })
    .select(SELECT_COLS)
    .single();
  if (error) throw new Error(`Failed to submit verification: ${error.message}`);
  return data as IdentityVerification;
}

/** The current user's most recent verification request, or null. Degrades to
 *  null if the table has not been migrated yet. */
export async function getMyVerification(): Promise<IdentityVerification | null> {
  const supabase = await createJuthoorSupabaseClient();
  const { data: authData } = await supabase.auth.getUser();
  const uid = authData.user?.id;
  if (!uid) return null;
  const { data, error } = await supabase
    .from('identity_verifications')
    .select(SELECT_COLS)
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return (data as IdentityVerification | null) ?? null;
}

async function assertAdmin(
  supabase: Awaited<ReturnType<typeof createJuthoorSupabaseClient>>,
): Promise<string> {
  const { data: authData } = await supabase.auth.getUser();
  const uid = authData.user?.id;
  if (!uid) throw new Error('Not authenticated');
  const { data } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', uid)
    .maybeSingle();
  if (!(data as { is_admin: boolean } | null)?.is_admin) {
    throw new Error('Not authorized');
  }
  return uid;
}

/** Admin: pending verification requests with signed document URLs. */
export async function listPendingVerifications(): Promise<PendingVerification[]> {
  const supabase = await createJuthoorSupabaseClient();
  await assertAdmin(supabase);

  const { data, error } = await supabase
    .from('identity_verifications')
    .select(SELECT_COLS)
    .eq('status', 'pending')
    .order('created_at', { ascending: true });
  if (error) return [];
  const rows = (data ?? []) as IdentityVerification[];
  if (rows.length === 0) return [];

  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, display_name_ar')
    .in('id', userIds);
  const nameById = new Map(
    (profiles ?? []).map((p) => [p.id, p.display_name_ar || p.display_name || null]),
  );

  const signed = await Promise.all(
    rows.map(async (r) => {
      const [idUrl, famUrl] = await Promise.all([
        supabase.storage.from(BUCKET).createSignedUrl(r.id_document_path, 600),
        r.family_evidence_path
          ? supabase.storage.from(BUCKET).createSignedUrl(r.family_evidence_path, 600)
          : Promise.resolve({ data: null as { signedUrl: string } | null }),
      ]);
      return {
        ...r,
        submitter_name: nameById.get(r.user_id) ?? null,
        id_document_url: idUrl.data?.signedUrl ?? null,
        family_evidence_url: famUrl.data?.signedUrl ?? null,
      };
    }),
  );
  return signed;
}

const ReviewSchema = z.object({
  id: z.string().uuid(),
  approve: z.boolean(),
  note: z.string().trim().max(2000).optional(),
});

/** Admin: approve or reject a verification request. */
export async function reviewVerification(
  input: z.input<typeof ReviewSchema>,
): Promise<void> {
  const parsed = ReviewSchema.parse(input);
  const supabase = await createJuthoorSupabaseClient();
  const reviewerId = await assertAdmin(supabase);

  const now = new Date().toISOString();
  const { error } = await supabase
    .from('identity_verifications')
    .update({
      status: parsed.approve ? 'approved' : 'rejected',
      reviewer_note: parsed.note?.trim() || null,
      reviewed_by: reviewerId,
      reviewed_at: now,
      updated_at: now,
    })
    .eq('id', parsed.id);
  if (error) throw new Error(`Failed to review: ${error.message}`);
}
