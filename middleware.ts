import { NextResponse, NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets that live under public/ (e.g. /cineworks/poster1.png).
  // 3D model + audio formats must be listed here too: anything missing falls
  // through to the auth redirect below and silently returns the app's HTML
  // instead of the asset, which makes models look "loaded" but parse as junk.
  if (
    /\.(?:png|jpe?g|gif|webp|avif|svg|ico|mp3|wav|ogg|m4a|mp4|webm|woff2?|ttf|otf|css|js|mjs|json|txt|html|wasm|unityweb|glb|gltf|bin|hdr|exr|ktx2|draco)$/i.test(
      pathname,
    )
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get('sb-access-token')?.value;

  // Public routes — reachable without login so shared links, payment returns,
  // the public leaderboard/profiles, and lore/film content all work for a
  // logged-out visitor. The GAME and personal/admin pages (/world, /self,
  // /treasury, /vault, /hut-admin) stay gated below. Login is still enforced
  // at the title-card "Begin" and at the game itself.
  const PUBLIC_PREFIXES = [
    '/awakening',          // intro / character creator / path (onboarding)
    '/profiles',           // shared soul profiles
    '/hierarchy',          // public leaderboard
    '/codex',              // lore codex
    '/cinema',             // films
    '/cineworks',          // film studio showcase
    '/support',            // donation entry
    '/thanks',             // post-donation thank-you (Stripe return)
    '/mission-confirmed',  // post-action confirmation (Stripe return)
    '/trial',              // trial / entry flow
  ];
  if (pathname === '/' || PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  // Allow Next.js internals and api
  if (pathname.startsWith('/_next') || pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Protect every other route — login is required to play. The gate cookie is
  // kept in lock-step with the real Supabase session in lib/supabase.ts (and is
  // rebuilt from the stored session on load), so a logged-in soul always carries
  // it. Onboarding (/ and /awakening*) stays public above so a cookie race can
  // never strand a new player mid-flow.
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


