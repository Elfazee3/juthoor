import { notFound } from 'next/navigation';
import { createJuthoorSupabaseClient } from '@/supabase-clients/juthoor-server';
import { listPendingVerifications } from '@/data/user/identityVerification';
import { AdminVerificationsClient } from './AdminVerificationsClient';

export const metadata = {
  title: 'مراجعة التوثيق — Verification review | Juthoor',
};

async function isCurrentUserAdmin(): Promise<boolean> {
  const supabase = await createJuthoorSupabaseClient();
  const { data: authData } = await supabase.auth.getUser();
  const uid = authData.user?.id;
  if (!uid) return false;
  const { data } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', uid)
    .maybeSingle();
  return Boolean((data as { is_admin: boolean } | null)?.is_admin);
}

export default async function AdminVerificationsPage() {
  // Non-admins get a 404 — the page does not exist for them.
  if (!(await isCurrentUserAdmin())) notFound();
  const pending = await listPendingVerifications().catch(() => []);
  return <AdminVerificationsClient initialPending={pending} />;
}
