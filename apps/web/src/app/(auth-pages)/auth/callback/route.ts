import { createServerClient } from '@supabase/ssr';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { sanitizeNextPath } from '@/lib/auth/safeRedirect';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next');

  const authCodeError = new URL('/auth/auth-code-error', requestUrl.origin);

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    // On any failure to exchange the code, send the user to the error page
    // rather than silently dropping them on the dashboard unauthenticated.
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        return NextResponse.redirect(authCodeError);
      }
    } catch {
      return NextResponse.redirect(authCodeError);
    }
  }

  revalidatePath('/', 'layout');

  // `next` is untrusted — sanitize to a same-origin path to avoid open redirect.
  const redirectTo = new URL(sanitizeNextPath(next), requestUrl.origin);
  return NextResponse.redirect(redirectTo);
}
