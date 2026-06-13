'use client';

import { Download } from 'lucide-react';

import { Button } from '@/components/ui/button';

interface Props {
  readonly treeId: string;
}

/**
 * Plain anchor disguised as a button. The server route streams the
 * .ged file with the correct `Content-Disposition` so the browser
 * downloads it without us touching Blob APIs.
 */
export function ExportGedcomButton({ treeId }: Props) {
  return (
    <Button asChild variant="outline">
      <a
        href={`/api/tree/${treeId}/gedcom`}
        download
        className="inline-flex items-center gap-2"
      >
        <Download className="h-4 w-4" />
        تصدير GEDCOM
      </a>
    </Button>
  );
}
