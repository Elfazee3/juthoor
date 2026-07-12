import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { sanitizeNextPath } from '@/lib/auth/safeRedirect';

// Handles email link confirmations (magic link, signup, invite, recovery,
// email-change). Supabase sends `type` and `token_hash` in the URL; we hand
// both to verifyOtp so any flavour of email confirmation works.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  // Sanitize to a same-origin path to avoid open-redirect via the `next` param
  // (also rejects protocol-relative `//host` and backslash tricks).
  const next = sanitizeNextPath(searchParams.get('next'));

  if (token_hash && type) {
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

    const { error } = await supabase.auth.verifyOtp({ type, token_hash });

    if (!error) {
      return NextResponse.redirect(new URL(next, req.url));
    }
  }

  return NextResponse.redirect(new URL('/auth/auth-code-error', req.url));
}
