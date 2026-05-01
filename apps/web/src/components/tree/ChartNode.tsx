'use client';

import Link from 'next/link';
import { User2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { PersonView } from '@/lib/tree/types';

/**
 * Chart node dimensions are tuned to the relatives-tree grid:
 * each node occupies a 2-unit-wide × 2-unit-tall cell, so connector lines
 * leave/enter at `center ± UNIT_PX` on each axis. With UNIT_PX = 100
 * (see FamilyChart) the cell is 200×200 px, and the card here is 168×196
 * — leaving a ~16 px horizontal gap (so neighbouring cards don't touch)
 * and a ~2 px vertical stub so connector lines land exactly on the top
 * and bottom edges of every card. Don't break the relationship between
 * these two files without updating UNIT_PX in lockstep.
 */
export const CHART_NODE_WIDTH = 168;
export const CHART_NODE_HEIGHT = 196;

const AVATAR_SIZE = 64;

interface Props {
  readonly person: PersonView;
  readonly treeId: string;
  /** Layout position from relatives-tree. */
  readonly left: number;
  readonly top: number;
  /** One relatives-tree unit in px — scales the whole chart. */
  readonly unitPx: number;
}

/**
 * One tile in the family chart. Rendered as absolutely-positioned HTML
 * over the SVG connector layer so Arabic text uses native font shaping
 * (SVG `<text>` shapes Arabic poorly in some browsers).
 *
 * Layout: a portrait card that fills the grid cell — avatar near the
 * top, name centred, dates pinned to the bottom. Avatar sits inside the
 * card (no negative margin overhang) so the visual centre matches the
 * grid centre and the connector lines meet the top/bottom edges.
 */
export function ChartNode({ person, treeId, left, top, unitPx }: Props) {
  const x = left * unitPx;
  const y = top * unitPx;
  const label = person.displayNameAr ?? person.displayNameEn ?? '—';
  const isFemale = person.gender === 'F';
  const isPlaceholder = person.isPlaceholder;

  const cardBg = isPlaceholder
    ? 'bg-[var(--jt-gold-100)]/55 border-dashed border-[var(--jt-gold-400)]/55'
    : isFemale
      ? 'bg-[var(--jt-terra-50)] border-[var(--jt-terra-200)]/70'
      : 'bg-[var(--jt-olive-50)] border-[var(--jt-olive-200)]/70';

  const avatarRing = isPlaceholder
    ? 'border-dashed border-[var(--jt-gold-400)]/60 bg-[var(--jt-gold-100)]/60'
    : isFemale
      ? 'border-[var(--jt-terra-300)]/80 bg-[var(--card)]'
      : 'border-[var(--jt-olive-300)]/80 bg-[var(--card)]';

  const iconColor = isPlaceholder
    ? 'text-[var(--jt-gold-600)]/80'
    : isFemale
      ? 'text-[var(--jt-terra-600)]'
      : 'text-[var(--jt-olive-700)]';

  const initial = label !== '—' ? label.trim().slice(0, 1) : null;

  return (
    <Link
      href={`/tree/${treeId}/person/${person.id}`}
      className={cn(
        'group absolute flex transition-transform',
        'hover:-translate-y-0.5'
      )}
      style={{
        left: `${x}px`,
        top: `${y}px`,
        width: `${CHART_NODE_WIDTH}px`,
        height: `${CHART_NODE_HEIGHT}px`,
      }}
      aria-label={label}
    >
      {/* Card body — takes the full footprint, content laid out top→bottom */}
      <div
        className={cn(
          'flex h-full w-full flex-col items-center justify-between rounded-2xl border px-3 py-4 shadow-[var(--jt-shadow-sm)] transition-shadow',
          'group-hover:shadow-[var(--jt-shadow-md)]',
          cardBg,
        )}
      >
        {/* Avatar */}
        <div
          className={cn(
            'flex flex-none items-center justify-center rounded-full border-2 shadow-sm',
            avatarRing,
          )}
          style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
        >
          {initial ? (
            <span
              className={cn('text-2xl font-bold', iconColor)}
              style={{ fontFamily: 'var(--jt-font-display, inherit)' }}
            >
              {initial}
            </span>
          ) : (
            <User2 className={cn('h-8 w-8', iconColor)} />
          )}
        </div>

        {/* Name — flexes to take the middle space */}
        <div className="flex w-full flex-1 items-center justify-center px-1 py-1 text-center">
          <div
            className="line-clamp-2 text-[13px] font-bold leading-tight text-[var(--jt-olive-900)]"
            dir={person.displayNameAr ? 'rtl' : 'ltr'}
            style={{ fontFamily: 'var(--jt-font-display, inherit)' }}
          >
            {label}
          </div>
        </div>

        {/* Year row, or placeholder badge — pinned bottom for symmetry */}
        <div className="flex h-4 w-full items-center justify-center text-[11px] text-[var(--jt-stone-500)]" dir="ltr">
          {isPlaceholder ? (
            <span className="rounded-full bg-[var(--jt-gold-400)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-[var(--jt-olive-900)]">
              مؤقت
            </span>
          ) : person.birthYear || person.deathYear ? (
            <span>
              {person.birthYear ?? '?'}
              {person.deathYear ? ` – ${person.deathYear}` : ''}
            </span>
          ) : (
            <span className="opacity-0">·</span>
          )}
        </div>

        {/* Subtle gold underline on hover */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-6 -bottom-px h-0.5 rounded-full bg-[var(--jt-gold-400)] opacity-0 transition-opacity group-hover:opacity-100"
        />
      </div>
    </Link>
  );
}
