'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Heart, Users } from 'lucide-react';

import { useRealtimeTree } from '@/hooks/useRealtimeTree';
import type { Neighbors } from '@/lib/tree/types';

import { EmptySlot, PersonSlot } from './PersonSlot';

interface Props {
  readonly treeId: string;
  readonly neighbors: Neighbors;
}

/**
 * The 360° centred view: focus in the middle, parents above, children
 * below, spouses on the end side (left in RTL), siblings on the start
 * side (right in RTL). Clicking any tile navigates to that person and
 * framer's shared layoutId creates a "fly to centre" animation.
 */
export function TreeView360({ treeId, neighbors }: Props) {
  const router = useRouter();
  useRealtimeTree(treeId);
  void router;

  const { focus, parents, siblings, spouses, childrenByFamily } = neighbors;
  const totalChildren = childrenByFamily.reduce(
    (acc, g) => acc + g.children.length,
    0,
  );

  return (
    <div dir="rtl" className="relative mx-auto w-full max-w-5xl">
      {/* Ambient gradient backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-60"
      >
        <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="grid grid-cols-[1fr_2fr_1fr] grid-rows-[auto_1fr_auto] gap-5 md:gap-7">
        {/* --- UP: Parents --- */}
        <motion.section
          layout
          className="col-span-3 flex flex-col items-center gap-3"
          aria-label="الآباء"
        >
          <SectionLabel icon={ArrowUp} label="الآباء" />
          <div className="flex w-full flex-wrap items-start justify-center gap-3">
            <AnimatePresence mode="popLayout">
              {parents.father ? (
                <PersonSlot
                  key={`father-${parents.father.id}`}
                  person={parents.father}
                  treeId={treeId}
                  variant="parent"
                  subtitle="الأب"
                />
              ) : (
                <EmptySlot label="الأب" hint="غير معروف — أضفه" />
              )}
              {parents.mother ? (
                <PersonSlot
                  key={`mother-${parents.mother.id}`}
                  person={parents.mother}
                  treeId={treeId}
                  variant="parent"
                  subtitle="الأم"
                />
              ) : (
                <EmptySlot label="الأم" hint="غير معروفة — أضفها" />
              )}
            </AnimatePresence>
          </div>
          <Connector orientation="vertical" />
        </motion.section>

        {/* --- START (right in RTL): Siblings --- */}
        <motion.section
          layout
          className="flex flex-col gap-2"
          aria-label="الأشقاء"
        >
          <SectionLabel icon={Users} label={`الأشقاء (${siblings.length})`} />
          <div className="flex flex-col gap-2">
            <AnimatePresence mode="popLayout">
              {siblings.length === 0 ? (
                <EmptySlot label="لا يوجد" />
              ) : (
                siblings.map((s) => (
                  <PersonSlot
                    key={`sib-${s.id}`}
                    person={s}
                    treeId={treeId}
                    variant="sibling"
                  />
                ))
              )}
            </AnimatePresence>
          </div>
        </motion.section>

        {/* --- CENTRE: Focus --- */}
        <motion.section
          layout
          className="flex items-center justify-center"
          aria-label="الشخص المحوري"
        >
          <div className="relative w-full max-w-sm">
            <div
              aria-hidden
              className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-to-bl from-primary/10 via-transparent to-amber-200/10 blur-xl"
            />
            <PersonSlot
              key={`focus-${focus.id}`}
              person={focus}
              treeId={treeId}
              variant="center"
            />
          </div>
        </motion.section>

        {/* --- END (left in RTL): Spouses --- */}
        <motion.section
          layout
          className="flex flex-col gap-2"
          aria-label="الأزواج"
        >
          <SectionLabel
            icon={Heart}
            label={`الزوج/ة (${spouses.length})`}
          />
          <div className="flex flex-col gap-2">
            <AnimatePresence mode="popLayout">
              {spouses.length === 0 ? (
                <EmptySlot label="لا يوجد" />
              ) : (
                spouses.map((s) => (
                  <PersonSlot
                    key={`sp-${s.id}`}
                    person={s}
                    treeId={treeId}
                    variant="spouse"
                  />
                ))
              )}
            </AnimatePresence>
          </div>
        </motion.section>

        {/* --- DOWN: Children --- */}
        <motion.section
          layout
          className="col-span-3 flex flex-col items-center gap-3"
          aria-label="الأبناء"
        >
          <Connector orientation="vertical" />
          <SectionLabel
            icon={ArrowDown}
            label={`الأبناء (${totalChildren})`}
          />
          <div className="w-full">
            {childrenByFamily.length === 0 ? (
              <div className="mx-auto max-w-xs">
                <EmptySlot label="لم يُضَف أبناء بعد" />
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {childrenByFamily.map((group) => (
                  <div
                    key={group.familyId}
                    className="rounded-2xl border bg-muted/30 p-3"
                  >
                    {childrenByFamily.length > 1 ? (
                      <div className="mb-2 text-xs text-muted-foreground">
                        مجموعة:{' '}
                        {group.otherParentId
                          ? 'من زواج مختلف'
                          : 'والد/ة غير محدد'}
                      </div>
                    ) : null}
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      <AnimatePresence mode="popLayout">
                        {group.children.map((c) => (
                          <PersonSlot
                            key={`ch-${c.id}`}
                            person={c}
                            treeId={treeId}
                            variant="child"
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.section>
      </div>
    </div>
  );
}

function SectionLabel({
  icon: Icon,
  label,
}: {
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly label: string;
}) {
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full border bg-background/60 px-2.5 py-1 text-[10px] uppercase tracking-wider text-muted-foreground backdrop-blur">
      <Icon className="h-3 w-3" />
      {label}
    </div>
  );
}

function Connector({
  orientation,
}: {
  readonly orientation: 'vertical' | 'horizontal';
}) {
  return (
    <div
      aria-hidden
      className={
        orientation === 'vertical'
          ? 'mx-auto h-6 w-px bg-gradient-to-b from-border to-transparent'
          : 'h-px w-6 bg-gradient-to-l from-border to-transparent'
      }
    />
  );
}
