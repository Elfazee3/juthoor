import { notFound } from 'next/navigation';
import { isCurrentUserAdmin } from '@/data/admin/requireAdmin';
import { listReviewQueue } from '@/data/admin/review';
import { AdminReviewClient } from './AdminReviewClient';

export const metadata = {
  title: 'مراجعة المطابقات — Match review | Juthoor',
};

export default async function AdminReviewPage() {
  // Non-admins get a 404 — the page does not exist for them.
  if (!(await isCurrentUserAdmin())) notFound();
  const initialCards = await listReviewQueue().catch(() => []);
  return <AdminReviewClient initialCards={initialCards} />;
}
