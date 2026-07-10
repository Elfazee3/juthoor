'use server';

import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { createJuthoorSupabaseClient } from '@/supabase-clients/juthoor-server';
import { getCachedLoggedInUserIdOrNull } from '@/rsc-data/supabase';

const RoleEnum = z.enum(['read_only', 'collaborator', 'owner']); // 'owner' blocked server-side
export type RequestedRole = z.infer<typeof RoleEnum>;

export type AccessRequest = {
  id: string;
  tree_id: string;
  user_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'revoked';
  requested_role: RequestedRole | null;
  proof_url: string | null;
  requester_note: string | null;
  requested_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  tree_name?: string;
  requester_display_name?: string | null;
  proof_signed_url?: string | null;
};

const RequestSchema = z.object({
  treeId: z.string().uuid(),
  role: z.enum(['read_only', 'collaborator']),
  proofUrl: z.string().min(1),
  note: z.string().trim().max(500).optional(),
});

/**
 * Upload a proof file (client uploads via signed URL OR server-signed buffer).
 * Expected to be called from a form that already transferred the file to Storage.
 * Accepts the storage path and records it in tree_members via the RPC.
 */
export async function submitAccessRequest(input: z.input<typeof RequestSchema>): Promise<AccessRequest> {
  const parsed = RequestSchema.parse(input);
  const supabase = await createJuthoorSupabaseClient();
  const { data, error } = await supabase.rpc('request_tree_access', {
    p_tree_id: parsed.treeId,
    p_role: parsed.role,
    p_proof_url: parsed.proofUrl,
    p_note: parsed.note ?? null,
  });
  if (error) throw new Error(error.message);
  return data as AccessRequest;
}

export async function approveAccessRequest(memberId: string): Promise<AccessRequest> {
  const supabase = await createJuthoorSupabaseClient();
  const { data, error } = await supabase.rpc('approve_tree_access_request', { p_member_id: memberId });
  if (error) throw new Error(error.message);
  return data as AccessRequest;
}

export async function rejectAccessRequest(memberId: string, reason: string | null = null): Promise<AccessRequest> {
  const supabase = await createJuthoorSupabaseClient();
  const { data, error } = await supabase.rpc('reject_tree_access_request', {
    p_member_id: memberId,
    p_reason: reason,
  });
  if (error) throw new Error(error.message);
  return data as AccessRequest;
}

/** List pending requests for trees the current user owns. */
export async function listIncomingRequests(): Promise<AccessRequest[]> {
  const supabase = await createJuthoorSupabaseClient();

  // Load pending rows. RLS only returns rows where the viewer owns the tree.
  const { data: memberRows, error: mErr } = await supabase
    .from('tree_members')
    .select('id, tree_id, user_id, status, requested_role, proof_url, requester_note, requested_at, reviewed_at, rejection_reason')
    .eq('status', 'pending')
    .order('requested_at', { ascending: false });
  if (mErr) throw new Error(mErr.message);
  const rows = (memberRows ?? []) as AccessRequest[];
  if (rows.length === 0) return [];

  // Batch-load tree names and requester profiles (two small queries >> nested join).
  const treeIds = Array.from(new Set(rows.map((r) => r.tree_id)));
  const userIds = Array.from(new Set(rows.map((r) => r.user_id)));

  const [treesRes, profilesRes] = await Promise.all([
    supabase.from('trees').select('id, name').in('id', treeIds),
    supabase.from('profiles').select('id, display_name, display_name_ar').in('id', userIds),
  ]);

  const treeById = new Map((treesRes.data ?? []).map((t) => [t.id, t.name]));
  const nameById = new Map(
    (profilesRes.data ?? []).map((p) => [p.id, p.display_name_ar || p.display_name || null]),
  );

  return Promise.all(
    rows.map(async (r) => {
      let signed: string | null = null;
      if (r.proof_url) {
        const { data: s } = await supabase.storage.from('proof-of-family').createSignedUrl(r.proof_url, 600);
        signed = s?.signedUrl ?? null;
      }
      return {
        ...r,
        tree_name: treeById.get(r.tree_id),
        requester_display_name: nameById.get(r.user_id) ?? null,
        proof_signed_url: signed,
      };
    }),
  );
}

/**
 * Build a storage path and return a signed upload URL for the requester to PUT to.
 * The signed URL is scoped to that specific object key, 5-minute expiry.
 */
export async function getProofUploadTarget(input: {
  treeId: string;
  fileExtension: string;
}): Promise<{ path: string; token: string }> {
  const ext = input.fileExtension.replace(/^\./, '').toLowerCase();
  if (!/^(jpg|jpeg|png|webp|pdf)$/.test(ext)) throw new Error('Unsupported file type');

  const uid = await getCachedLoggedInUserIdOrNull();
  if (!uid) throw new Error('Not authenticated');
  const supabase = await createJuthoorSupabaseClient();

  const path = `${input.treeId}/${uid}/${randomUUID()}.${ext}`;
  const { data, error } = await supabase.storage.from('proof-of-family').createSignedUploadUrl(path);
  if (error) throw new Error(error.message);
  return { path, token: data.token };
}
