import { NextResponse, NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Paths to redirect
  const protectedPaths = [
    '/sanctum',
    '/codex',
    '/self',
    '/treasury',
    '/vault',
    '/archive',
    '/cineworks'
  ];

  if (protectedPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/sanctum/:path*',
    '/codex/:path*',
    '/self/:path*',
    '/treasury/:path*',
    '/vault/:path*',
    '/archive/:path*',
    '/cineworks/:path*'
  ],
};
