'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { createClient } from '@/supabase-clients/client';

/**
 * Subscribe to Supabase Realtime for all tables that affect a tree's
 * shape (persons, person_names, families, family_children, events)
 * and invalidate the React Query cache on any change so other tabs
 * and collaborators converge within the Realtime default latency
 * (~2 s).
 *
 * The RLS policies already scope what rows each client can SEE on
 * the REST API, but Realtime doesn't push RLS in local dev by default
 * — we rely on route-level auth + the router.refresh() in mutations
 * for immediate single-client updates. Realtime is the multi-client
 * safety net.
 */
export function useRealtimeTree(treeId: string): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!treeId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`tree-${treeId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'persons', filter: `tree_id=eq.${treeId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tree', treeId] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'families', filter: `tree_id=eq.${treeId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tree', treeId] });
        }
      )
      .on(
        'postgres_changes',
        // family_children has no tree_id column; invalidate on any
        // change and let the page re-fetch filter.
        { event: '*', schema: 'public', table: 'family_children' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tree', treeId] });
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'person_names' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['tree', treeId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, treeId]);
}
