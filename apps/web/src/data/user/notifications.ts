'use server';

import { z } from 'zod';
import { createJuthoorSupabaseClient } from '@/supabase-clients/juthoor-server';
import { getCachedLoggedInUserIdOrNull } from '@/rsc-data/supabase';

export type AppNotification = {
  id: string;
  kind: string;
  titleAr: string | null;
  titleEn: string | null;
  bodyAr: string | null;
  bodyEn: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};

const SELECT = 'id, kind, title_ar, title_en, body_ar, body_en, link, read_at, created_at';

type Row = {
  id: string;
  kind: string;
  title_ar: string | null;
  title_en: string | null;
  body_ar: string | null;
  body_en: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

function mapRow(r: Row): AppNotification {
  return {
    id: r.id,
    kind: r.kind,
    titleAr: r.title_ar,
    titleEn: r.title_en,
    bodyAr: r.body_ar,
    bodyEn: r.body_en,
    link: r.link,
    readAt: r.read_at,
    createdAt: r.created_at,
  };
}

/** The current user's in-app notifications, newest first. RLS scopes to self. */
export async function listNotifications(limit = 20): Promise<AppNotification[]> {
  const uid = await getCachedLoggedInUserIdOrNull();
  if (!uid) return [];
  const supabase = await createJuthoorSupabaseClient();
  const { data, error } = await supabase
    .from('notifications')
    .select(SELECT)
    .order('created_at', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 50));
  if (error) return [];
  return ((data ?? []) as Row[]).map(mapRow);
}

export async function countUnreadNotifications(): Promise<number> {
  const uid = await getCachedLoggedInUserIdOrNull();
  if (!uid) return 0;
  const supabase = await createJuthoorSupabaseClient();
  const { count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .is('read_at', null);
  return count ?? 0;
}

const IdSchema = z.object({ id: z.string().uuid() });

export async function markNotificationRead(input: z.input<typeof IdSchema>): Promise<void> {
  const { id } = IdSchema.parse(input);
  const uid = await getCachedLoggedInUserIdOrNull();
  if (!uid) throw new Error('Not authenticated');
  const supabase = await createJuthoorSupabaseClient();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id)
    .is('read_at', null);
  if (error) throw new Error(error.message);
}

export async function markAllNotificationsRead(): Promise<void> {
  const uid = await getCachedLoggedInUserIdOrNull();
  if (!uid) throw new Error('Not authenticated');
  const supabase = await createJuthoorSupabaseClient();
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null);
  if (error) throw new Error(error.message);
}
