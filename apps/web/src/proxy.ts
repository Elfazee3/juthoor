import { type NextRequest } from 'next/server';
import { updateSession } from './supabase-clients/middleware';

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // api routes are not handled by middleware for this project.
  if (pathname.startsWith('/api/') || pathname === '/api') {
    return null;
  }
  if (pathname) return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};

