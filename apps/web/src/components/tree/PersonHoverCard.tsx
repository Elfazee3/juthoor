'use client';

import { User2 } from 'lucide-react';

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import type { PersonView } from '@/lib/tree/types';

interface Props {
  readonly person: PersonView;
  readonly children: React.ReactNode;
}

/**
 * Pop-up summary (FRS: "hover over person → pop-up summary"). Uses
 * Radix HoverCard so it's keyboard-accessible. Data comes from the
 * PersonView we already have in memory — no extra fetch needed.
 */
export function PersonHoverCard({ person, children }: Props) {
  return (
    <HoverCard openDelay={200} closeDelay={100}>
      <HoverCardTrigger asChild>{children}</HoverCardTrigger>
      <HoverCardContent className="w-64" side="top">
        <div className="flex items-start gap-3" dir="rtl">
          <User2
            className={
              person.gender === 'F'
                ? 'h-6 w-6 text-rose-500'
                : 'h-6 w-6 text-blue-500'
            }
          />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="truncate font-semibold">
              {person.displayNameAr ?? person.displayNameEn ?? '—'}
            </div>
            {person.displayNameEn && person.displayNameAr ? (
              <div className="truncate text-xs text-muted-foreground" dir="ltr">
                {person.displayNameEn}
              </div>
            ) : null}
            {person.birthYear || person.deathYear ? (
              <div className="text-xs text-muted-foreground">
                {person.birthYear ?? '?'}
                {' — '}
                {person.deathYear ?? (person.birthYear ? 'حاليا' : '?')}
              </div>
            ) : null}
            {person.isPlaceholder ? (
              <div className="rounded bg-amber-100 px-1.5 py-0.5 text-xs text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                سجل مؤقت
              </div>
            ) : null}
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
