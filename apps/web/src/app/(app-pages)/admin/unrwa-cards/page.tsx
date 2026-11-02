import { notFound } from 'next/navigation';
import { isCurrentUserAdmin } from '@/data/admin/requireAdmin';
import { listUnrwaCardRequests } from '@/data/admin/unrwaCards';
import { AdminUnrwaCardsClient } from './AdminUnrwaCardsClient';

export const metadata = {
  title: 'التحقق من بطاقات الأونروا — UNRWA card check | Juthoor',
};

export default async function AdminUnrwaCardsPage() {
  // Non-admins get a 404 — the page does not exist for them.
  if (!(await isCurrentUserAdmin())) notFound();
  const requests = await listUnrwaCardRequests().catch(() => []);
  return <AdminUnrwaCardsClient initialRequests={requests} />;
}
