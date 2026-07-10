import { notFound } from 'next/navigation';
import { isCurrentUserAdmin } from '@/data/admin/requireAdmin';
import { listPendingVerifications } from '@/data/user/identityVerification';
import { AdminVerificationsClient } from './AdminVerificationsClient';

export const metadata = {
  title: 'مراجعة التوثيق — Verification review | Juthoor',
};

export default async function AdminVerificationsPage() {
  // Non-admins get a 404 — the page does not exist for them.
  if (!(await isCurrentUserAdmin())) notFound();
  const pending = await listPendingVerifications().catch(() => []);
  return <AdminVerificationsClient initialPending={pending} />;
}
