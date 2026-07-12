import { Suspense } from 'react';
import { listConnections } from '@/data/user/hints';
import { ConnectionsClient } from './ConnectionsClient';

export const metadata = {
  title: 'روابط عائلية — Connections | Juthoor',
};

async function ConnectionsShell() {
  try {
    const connections = await listConnections();
    return <ConnectionsClient initialConnections={connections} />;
  } catch {
    return <ConnectionsClient initialConnections={[]} />;
  }
}

export default function ConnectionsPage() {
  return (
    <Suspense fallback={<ConnectionsClient initialConnections={[]} />}>
      <ConnectionsShell />
    </Suspense>
  );
}
