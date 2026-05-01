'use client';

import { motion } from 'framer-motion';
import { useMemo, useRef, useState } from 'react';
import calcTree from 'relatives-tree';
import type { ExtNode } from 'relatives-tree/lib/types';

import type { PersonView, TreeSnapshot } from '@/lib/tree/types';
import { toRelativesTree } from '@/lib/tree/toRelativesTree';

import {
  CHART_NODE_HEIGHT,
  CHART_NODE_WIDTH,
  ChartNode,
} from './ChartNode';

interface Props {
  readonly treeId: string;
  readonly snapshot: TreeSnapshot;
  readonly rootPersonId: string;
}

// relatives-tree reports positions in grid units. Each node occupies
// a 2-unit × 2-unit grid cell, so connector endpoints sit at
// `center ± UNIT_PX` on each axis. Pick UNIT_PX so 2 × UNIT_PX is just
// slightly larger than CHART_NODE_HEIGHT — that way the connector lines
// stop a couple of pixels above/below the visible card edge with a
// clean 2-px stub. Currently: card 168×196, UNIT_PX 100 → 200×200 cell
// with 16 px horizontal gap and ~2 px vertical stub on each side.
const UNIT_PX = 100;
// PADDING must be ≥ max(CHART_NODE_WIDTH, CHART_NODE_HEIGHT) / 2 + slack —
// relatives-tree reports `canvas.width/height` as the bounding box of node
// CENTERS (not edges), so the topmost/leftmost card overhangs by half its
// own size. With CHART_NODE_HEIGHT=196 the half-overhang is 98px; we use
// 120 to leave breathing room and keep the chart visually framed.
const PADDING = 120;

/**
 * Full family-tree chart with pan + zoom. Uses `relatives-tree` for
 * the layout algorithm, then renders nodes as absolutely-positioned
 * HTML over an SVG connector layer.
 */
export function FamilyChart({ treeId, snapshot, rootPersonId }: Props) {
  const personById = useMemo(
    () => new Map(snapshot.persons.map((p) => [p.id, p])),
    [snapshot.persons]
  );

  const { nodes, canvas, connectors } = useMemo(() => {
    const rtNodes = toRelativesTree(snapshot);
    // relatives-tree throws when rootId is not in the nodes list — guard.
    if (!rtNodes.some((n) => n.id === rootPersonId)) {
      return {
        nodes: [] as readonly ExtNode[],
        canvas: { width: 0, height: 0 },
        connectors: [] as readonly (readonly [number, number, number, number])[],
      };
    }
    const data = calcTree(rtNodes, {
      rootId: rootPersonId,
      placeholders: true,
    });
    return data;
  }, [snapshot, rootPersonId]);

  // pan/zoom state
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement | null>(null);

  function handleWheel(e: React.WheelEvent<HTMLDivElement>) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const next = Math.min(
      2,
      Math.max(0.35, scale + (e.deltaY < 0 ? 0.1 : -0.1))
    );
    setScale(next);
  }

  const canvasWidth = canvas.width * UNIT_PX + PADDING * 2;
  const canvasHeight = canvas.height * UNIT_PX + PADDING * 2;

  if (nodes.length === 0) {
    return (
      <div className="rounded border p-6 text-center text-muted-foreground">
        لا توجد بيانات كافية لعرض المخطط بعد.
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      className="relative h-[70vh] overflow-auto rounded-xl border bg-muted/20"
      dir="ltr"
    >
      <div className="flex items-center justify-between border-b bg-card/80 p-2 text-xs text-muted-foreground backdrop-blur-sm sticky top-0 z-10">
        <span>
          {nodes.length} عقدة • قرّب بالضغط على Ctrl والعجلة
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="rounded border px-2 py-1 hover:bg-muted"
            onClick={() => setScale((s) => Math.max(0.35, s - 0.1))}
          >
            −
          </button>
          <span className="min-w-[3ch] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            type="button"
            className="rounded border px-2 py-1 hover:bg-muted"
            onClick={() => setScale((s) => Math.min(2, s + 0.1))}
          >
            +
          </button>
        </div>
      </div>

      <motion.div
        className="relative"
        style={{
          width: canvasWidth,
          height: canvasHeight,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
        }}
        drag
        dragConstraints={containerRef}
        dragMomentum={false}
      >
        {/* SVG connector layer */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={canvasWidth}
          height={canvasHeight}
        >
          <g transform={`translate(${PADDING} ${PADDING})`}>
            {connectors.map((c, i) => (
              <line
                key={i}
                x1={c[0] * UNIT_PX}
                y1={c[1] * UNIT_PX}
                x2={c[2] * UNIT_PX}
                y2={c[3] * UNIT_PX}
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                className="text-[var(--jt-olive-500)]/85"
              />
            ))}
          </g>
        </svg>

        {/* Node layer */}
        <div
          className="absolute"
          style={{ left: PADDING, top: PADDING }}
        >
          {nodes.map((n) => {
            const person = personById.get(n.id);
            if (!person) return null;
            // relatives-tree gives node centre in grid units; convert to
            // top-left by offsetting half the node size.
            const leftGrid = n.left - CHART_NODE_WIDTH / 2 / UNIT_PX;
            const topGrid = n.top - CHART_NODE_HEIGHT / 2 / UNIT_PX;
            return (
              <ChartNode
                key={n.id}
                person={person}
                treeId={treeId}
                left={leftGrid}
                top={topGrid}
                unitPx={UNIT_PX}
              />
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

// Re-export the person type for callers.
export type { PersonView };
