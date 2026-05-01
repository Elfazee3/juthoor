'use client';

import { motion } from 'framer-motion';
import type { PathNode } from '@/data/user/degrees';

/**
 * Horizontal SVG: circles for each person, olive-branch connector curves
 * between them, and relation labels above each edge.
 */
export function PathGraph({
  path,
  locale,
}: {
  path: PathNode[];
  locale: 'ar' | 'en';
}) {
  const n = path.length;
  if (n === 0) return null;

  const nodeSize = 56;
  const gap = 110;
  const width = n * nodeSize + (n - 1) * gap + 40;
  const height = 160;
  const yMid = height / 2;
  const startX = 20 + nodeSize / 2;

  const centers = Array.from({ length: n }, (_, i) => ({
    x: startX + i * (nodeSize + gap),
    y: yMid,
  }));

  return (
    <div className="overflow-x-auto" dir="ltr">
      <svg width={width} height={height} className="block">
        {/* Connector curves */}
        {centers.slice(0, -1).map((c, i) => {
          const c2 = centers[i + 1];
          const midX = (c.x + c2.x) / 2;
          const controlY = yMid - 26;
          const rel = path[i + 1].relation;
          return (
            <g key={`edge-${i}`}>
              <motion.path
                d={`M ${c.x + nodeSize / 2} ${c.y} Q ${midX} ${controlY} ${c2.x - nodeSize / 2} ${c2.y}`}
                stroke="var(--jt-olive-500)"
                strokeWidth={1.8}
                fill="none"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.7, delay: 0.15 * i + 0.2, ease: 'easeOut' }}
              />
              <motion.circle
                cx={midX}
                cy={controlY}
                r="4"
                fill="var(--jt-gold-500)"
                stroke="var(--jt-stone-50)"
                strokeWidth="1.2"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.15 * i + 0.6, type: 'spring', stiffness: 200 }}
              />
              <motion.text
                x={midX}
                y={controlY - 10}
                textAnchor="middle"
                className="fill-[var(--jt-stone-500)] text-[10px] font-semibold uppercase tracking-[0.15em]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 * i + 0.7 }}
              >
                {relationLabel(rel, locale)}
              </motion.text>
            </g>
          );
        })}

        {/* Node circles */}
        {centers.map((c, i) => {
          const node = path[i];
          const label = locale === 'ar' ? node.name_ar || node.name_en : node.name_en || node.name_ar;
          const initial = (label ?? '·').trim().slice(0, 1);
          const isSelf = node.relation === 'self';
          return (
            <motion.g
              key={node.person_id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15 * i, type: 'spring', stiffness: 150, damping: 14 }}
            >
              <circle
                cx={c.x}
                cy={c.y}
                r={nodeSize / 2}
                fill={isSelf ? 'var(--jt-olive-700)' : 'var(--jt-olive-100)'}
                stroke={isSelf ? 'var(--jt-olive-800)' : 'var(--jt-olive-300)'}
                strokeWidth="1.5"
              />
              <text
                x={c.x}
                y={c.y + 6}
                textAnchor="middle"
                className={`text-xl font-bold ${isSelf ? 'fill-[var(--jt-stone-50)]' : 'fill-[var(--jt-olive-800)]'}`}
                style={{ fontFamily: 'var(--jt-font-display)' }}
              >
                {initial}
              </text>
              <text
                x={c.x}
                y={c.y + nodeSize / 2 + 18}
                textAnchor="middle"
                className="fill-[var(--jt-stone-700)] text-[11px] font-semibold"
                style={{ fontFamily: 'var(--jt-font-display)' }}
              >
                {truncate(label, 14)}
              </text>
            </motion.g>
          );
        })}
      </svg>
    </div>
  );
}

function truncate(s: string | null, n: number): string {
  if (!s) return '';
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

function relationLabel(rel: string, locale: 'ar' | 'en'): string {
  const ar: Record<string, string> = { parent: '← والد', child: '← ابن', spouse: '← زوج', sibling: '← شقيق' };
  const en: Record<string, string> = { parent: 'parent', child: 'child', spouse: 'spouse', sibling: 'sibling' };
  return (locale === 'ar' ? ar[rel] : en[rel]) ?? rel;
}
