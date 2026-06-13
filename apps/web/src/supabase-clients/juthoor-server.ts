/**
 * Juthoor-typed Supabase server client.
 *
 * The existing `supabase-clients/server.ts` is parameterised on a stale
 * `lib/database.types.ts` that was generated before the GEDCOM schema
 * migration. Rather than risk breaking the `privateItems` pages that
 * depend on the old types, we expose a separate client typed against
 * the canonical Juthoor `Database` interface in `types/database.ts`.
 *
 * To regenerate when the schema changes:
 *   npx supabase gen types typescript --project-id nlufpicjdeeqcgepewdg \
 *     > apps/web/src/types/database.ts
 */

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

import type { Database } from '@/types/database';

export const createJuthoorSupabaseClient = async () => {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // `setAll` called from a Server Component — safe to ignore
            // when middleware refreshes sessions.
          }
        },
      },
    }
  );
};
