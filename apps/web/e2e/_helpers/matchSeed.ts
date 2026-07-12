import { randomUUID } from 'node:crypto';
import { request, type APIRequestContext } from '@playwright/test';
import { localStack, serviceHeaders } from './localStack';

export interface SeededMatch {
  matchId: string;
  marker: string; // a unique display-name marker to locate the card in the UI
  ownerAId: string;
  ownerBId: string;
  personAId: string;
  personBId: string;
}

async function post(
  ctx: APIRequestContext,
  apiUrl: string,
  headers: Record<string, string>,
  pathAndTable: string,
  data: unknown,
): Promise<unknown[]> {
  const res = await ctx.post(`${apiUrl}${pathAndTable}`, {
    headers: { ...headers, Prefer: 'return=representation' },
    data,
  });
  if (!res.ok()) throw new Error(`seed ${pathAndTable} failed: ${res.status()} ${await res.text()}`);
  return (await res.json()) as unknown[];
}

async function createUser(
  ctx: APIRequestContext,
  apiUrl: string,
  headers: Record<string, string>,
  email: string,
): Promise<string> {
  const res = await ctx.post(`${apiUrl}/auth/v1/admin/users`, {
    headers,
    data: { email, password: 'E2e-Seed-Passw0rd!', email_confirm: true },
  });
  if (!res.ok()) throw new Error(`seed user ${email}: ${res.status()} ${await res.text()}`);
  return ((await res.json()) as { id: string }).id;
}

/**
 * Seed a pending cross-tree match between two DECEASED people (so no living
 * suppression), each in a public tree owned by a distinct user. All via the
 * service_role (bypasses RLS). Person A carries a unique marker in its name so a
 * spec can find exactly this card in the admin queue.
 */
export async function seedPendingMatch(): Promise<SeededMatch> {
  const { apiUrl, serviceKey } = localStack();
  const headers = serviceHeaders(serviceKey);
  const ctx = await request.newContext();
  try {
    const stamp = Date.now();
    const marker = `E2E-${stamp}`;

    const ownerAId = await createUser(ctx, apiUrl, headers, `e2e_owner_a_${stamp}@example.com`);
    const ownerBId = await createUser(ctx, apiUrl, headers, `e2e_owner_b_${stamp}@example.com`);

    const treeAId = randomUUID();
    const treeBId = randomUUID();
    await post(ctx, apiUrl, headers, '/rest/v1/trees', [
      { id: treeAId, name: `${marker} Tree A`, owner_id: ownerAId, is_public: true },
      { id: treeBId, name: `${marker} Tree B`, owner_id: ownerBId, is_public: true },
    ]);

    // person A gets the unique marker in its display name; both are deceased.
    const ids = [randomUUID(), randomUUID()].sort();
    const [personAId, personBId] = ids; // person_a_id < person_b_id for the match
    await post(ctx, apiUrl, headers, '/rest/v1/persons', [
      { id: personAId, tree_id: treeAId, gender: 'M', is_living: false, display_name_ar: `${marker} إبراهيم`, display_name_en: `${marker} Ibrahim` },
      { id: personBId, tree_id: treeBId, gender: 'M', is_living: false, display_name_ar: `${marker} ابراهيم`, display_name_en: `${marker} Ibraheem` },
    ]);
    await post(ctx, apiUrl, headers, '/rest/v1/events', [
      { person_id: personAId, event_type: 'DEAT' },
      { person_id: personBId, event_type: 'DEAT' },
    ]);

    const breakdown = {
      meta: { version: 'frs-v1', score: 320, score_pct: 0.82, decision: 'review', vetoes: [], privacy: null },
      params: {
        given: { w: 10, pts: 10 },
        surname: { w: 10, pts: 10 },
        father: { w: 10, pts: 10 },
        pgf: { w: 25, pts: 25 },
        mother: { w: 20, pts: 0 },
        birth_year: { w: 25, pts: 25 },
      },
    };
    const [match] = (await post(ctx, apiUrl, headers, '/rest/v1/matches', [
      {
        person_a_id: personAId,
        person_b_id: personBId,
        confidence_score: 320,
        status: 'pending',
        found_by: 'system',
        score_breakdown: breakdown,
      },
    ])) as Array<{ id: string }>;

    return { matchId: match.id, marker, ownerAId, ownerBId, personAId, personBId };
  } finally {
    await ctx.dispose();
  }
}

/** Read a match's current status via the service role (for assertions). */
export async function getMatchStatus(matchId: string): Promise<string | null> {
  const { apiUrl, serviceKey } = localStack();
  const ctx = await request.newContext();
  try {
    const res = await ctx.get(`${apiUrl}/rest/v1/matches?id=eq.${matchId}&select=status`, {
      headers: serviceHeaders(serviceKey),
    });
    if (!res.ok()) return null;
    const rows = (await res.json()) as Array<{ status: string }>;
    return rows[0]?.status ?? null;
  } finally {
    await ctx.dispose();
  }
}

export interface SeededOwnerHint {
  hintId: string;
  matchId: string;
  marker: string;
  ownerTreeId: string;
  counterpartOwnerId: string;
}

/**
 * Seed a DEFERRED match handed to an owner: the owner (ownerUserId) owns a tree +
 * a deceased person; a counterpart (a fresh user) owns the other side; a
 * match_hint (pending) links the owner to the match. The owner then sees a masked
 * card at /dashboard/connections.
 */
export async function seedOwnerHint(ownerUserId: string): Promise<SeededOwnerHint> {
  const { apiUrl, serviceKey } = localStack();
  const headers = serviceHeaders(serviceKey);
  const ctx = await request.newContext();
  try {
    const stamp = Date.now();
    const marker = `E2E-OWN-${stamp}`;
    const counterpartOwnerId = await createUser(ctx, apiUrl, headers, `e2e_cp_${stamp}@example.com`);

    const ownerTreeId = randomUUID();
    const cpTreeId = randomUUID();
    await post(ctx, apiUrl, headers, '/rest/v1/trees', [
      { id: ownerTreeId, name: `${marker} My Tree`, owner_id: ownerUserId, is_public: true },
      { id: cpTreeId, name: `${marker} Other Tree`, owner_id: counterpartOwnerId, is_public: true },
    ]);

    const ownerPersonId = randomUUID();
    const cpPersonId = randomUUID();
    await post(ctx, apiUrl, headers, '/rest/v1/persons', [
      { id: ownerPersonId, tree_id: ownerTreeId, gender: 'M', is_living: false, display_name_ar: `${marker} جدّي`, display_name_en: `${marker} My Ancestor` },
      { id: cpPersonId, tree_id: cpTreeId, gender: 'M', is_living: false, display_name_ar: `${marker} نظير`, display_name_en: `${marker} Counterpart` },
    ]);
    await post(ctx, apiUrl, headers, '/rest/v1/events', [
      { person_id: ownerPersonId, event_type: 'DEAT' },
      { person_id: cpPersonId, event_type: 'DEAT' },
    ]);

    const [aId, bId] = [ownerPersonId, cpPersonId].sort();
    const breakdown = {
      meta: { version: 'frs-v1', score: 300, score_pct: 0.8, decision: 'review', vetoes: [], privacy: null },
      params: { given: { w: 10, pts: 10 }, surname: { w: 10, pts: 10 }, birth_year: { w: 25, pts: 25 } },
    };
    const [match] = (await post(ctx, apiUrl, headers, '/rest/v1/matches', [
      { person_a_id: aId, person_b_id: bId, confidence_score: 300, status: 'deferred', found_by: 'system', score_breakdown: breakdown },
    ])) as Array<{ id: string }>;

    const [hint] = (await post(ctx, apiUrl, headers, '/rest/v1/match_hints', [
      { match_id: match.id, owner_user_id: ownerUserId, counterpart_person_id: cpPersonId, status: 'pending' },
    ])) as Array<{ id: string }>;

    return { hintId: hint.id, matchId: match.id, marker, ownerTreeId, counterpartOwnerId };
  } finally {
    await ctx.dispose();
  }
}

export async function getHintStatus(hintId: string): Promise<string | null> {
  const { apiUrl, serviceKey } = localStack();
  const ctx = await request.newContext();
  try {
    const res = await ctx.get(`${apiUrl}/rest/v1/match_hints?id=eq.${hintId}&select=status`, {
      headers: serviceHeaders(serviceKey),
    });
    if (!res.ok()) return null;
    const rows = (await res.json()) as Array<{ status: string }>;
    return rows[0]?.status ?? null;
  } finally {
    await ctx.dispose();
  }
}

export async function cleanupOwnerHint(seed: SeededOwnerHint): Promise<void> {
  const { apiUrl, serviceKey } = localStack();
  const headers = serviceHeaders(serviceKey);
  const ctx = await request.newContext();
  try {
    await ctx.delete(`${apiUrl}/auth/v1/admin/users/${seed.counterpartOwnerId}`, { headers }).catch(() => undefined);
    await ctx.delete(`${apiUrl}/rest/v1/trees?id=eq.${seed.ownerTreeId}`, { headers }).catch(() => undefined);
  } finally {
    await ctx.dispose();
  }
}

/** Tear down a seeded scenario: deleting the owner users cascades trees → persons
 *  → matches → events. */
export async function cleanupSeed(seed: SeededMatch): Promise<void> {
  const { apiUrl, serviceKey } = localStack();
  const headers = serviceHeaders(serviceKey);
  const ctx = await request.newContext();
  try {
    for (const uid of [seed.ownerAId, seed.ownerBId]) {
      await ctx
        .delete(`${apiUrl}/auth/v1/admin/users/${uid}`, { headers })
        .catch(() => undefined);
    }
  } finally {
    await ctx.dispose();
  }
}
