import { NextResponse, NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets that live under public/ (e.g. /cineworks/poster1.png)
  if (/\.(?:png|jpe?g|gif|webp|svg|ico|mp3|mp4|woff2?|css|js|json|txt|html)$/i.test(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get('sb-access-token')?.value;

  // Only the title card (root) is public. Everything else — including the
  // game (/awakening*) — requires a signed-in soul. ALL users must log in
  // before they can play.
  if (pathname === '/') {
    return NextResponse.next();
  }

  // Allow Next.js internals and api
  if (pathname.startsWith('/_next') || pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Protect all other routes
  if (!token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};


