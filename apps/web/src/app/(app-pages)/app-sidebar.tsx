import {
  Sidebar,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { getCachedLoggedInVerifiedSupabaseUser } from '@/rsc-data/supabase';
import { createJuthoorSupabaseClient } from '@/supabase-clients/juthoor-server';
import Link from 'next/link';
import { Suspense } from 'react';
import { AppSidebarContent } from './app-sidebar-client';

function JuthoorGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 21V9" />
      <path d="M12 9c-3-2-5-5-5-7 2 0 5 2 7 4" />
      <path d="M12 9c3-2 5-5 5-7-2 0-5 2-7 4" />
      <path d="M5 17c2 0 4 1 5 3 1-2 3-3 5-3" />
      <path d="M4 13c2-1 4-1 6 1 1-2 3-2 5-1" />
    </svg>
  );
}

function SidebarHeaderContent() {
  return (
    <SidebarHeader>
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" asChild>
            <Link href="/">
              <div className="flex aspect-square size-9 items-center justify-center rounded-xl bg-[var(--jt-olive-600)] text-[var(--jt-stone-50)]">
                <JuthoorGlyph />
              </div>
              <div className="grid flex-1 text-start leading-tight">
                <span
                  className="truncate text-lg font-bold text-[var(--jt-olive-800)]"
                  style={{ fontFamily: 'var(--jt-font-display)' }}
                >
                  جذور
                </span>
                <span className="truncate text-[9px] font-semibold uppercase tracking-[0.22em] text-[var(--jt-stone-500)]">
                  Juthoor
                </span>
              </div>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarHeader>
  );
}

async function SidebarContentWrapper() {
  const { user } = await getCachedLoggedInVerifiedSupabaseUser();

  // Load profile so we can display the Arabic display name + avatar initial
  let displayName: string | null = null;
  let displayNameAr: string | null = null;
  let pendingRequestsCount = 0;
  try {
    const supabase = await createJuthoorSupabaseClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('display_name, display_name_ar')
      .eq('id', user.id)
      .maybeSingle();
    displayName = profile?.display_name ?? null;
    displayNameAr = profile?.display_name_ar ?? null;

    // Pending requests on trees the current user OWNS (RLS scopes to caller's trees)
    const { count } = await supabase
      .from('tree_members')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'pending');
    pendingRequestsCount = count ?? 0;
  } catch {
    // non-fatal: sidebar still renders, just without profile flourishes
  }

  return (
    <AppSidebarContent
      userEmail={user.email ?? ''}
      displayName={displayName}
      displayNameAr={displayNameAr}
      pendingRequestsCount={pendingRequestsCount}
    />
  );
}

export async function AppSidebar() {
  return (
    <Sidebar variant="inset">
      <SidebarHeaderContent />
      <Suspense fallback={null}>
        <SidebarContentWrapper />
      </Suspense>
    </Sidebar>
  );
}
