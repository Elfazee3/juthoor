import { Suspense } from 'react';
import { listIncomingRequests } from '@/data/user/access';
import { RequestsClient } from './RequestsClient';

async function RequestsShell() {
  try {
    const requests = await listIncomingRequests();
    return <RequestsClient initialRequests={requests} />;
  } catch {
    return <RequestsClient initialRequests={[]} />;
  }
}

export default function RequestsPage() {
  return (
    <Suspense fallback={<RequestsClient initialRequests={[]} />}>
      <RequestsShell />
    </Suspense>
  );
}
