import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

// Maps DB role value → dashboard path
const ROLE_TO_PATH: Record<string, string> = {
  pengampu: '/pengampu',
  orangtua: '/orangtua',
  koordinator: '/koordinator',
  kepala_sekolah: '/kepalasekolah',
  tata_usaha: '/stafftu',
};

// Maps dashboard path prefix → required DB role value
const DASHBOARD_ROUTES: { prefix: string; role: string }[] = [
  { prefix: '/pengampu', role: 'pengampu' },
  { prefix: '/orangtua', role: 'orangtua' },
  { prefix: '/koordinator', role: 'koordinator' },
  { prefix: '/kepalasekolah', role: 'kepala_sekolah' },
  { prefix: '/stafftu', role: 'tata_usaha' },
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // -----------------------------------------------------------------------
  // 0. MAINTENANCE MODE CHECK
  // -----------------------------------------------------------------------
  const isExcluded =
    pathname === '/maintenance' ||
    pathname === '/login' ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico' ||
    pathname.startsWith('/api');

  if (!isExcluded) {
    try {
      const { data } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'maintenance_mode')
        .single();

      if (data?.value === 'true') {
        const userRole = request.cookies.get('sb-user-role')?.value;
        if (userRole !== 'tata_usaha') {
          return NextResponse.redirect(new URL('/maintenance', request.url));
        }
      }
    } catch (error) {
      console.error('Error fetching maintenance mode in middleware:', error);
    }
  }

  const token = request.cookies.get('sb-access-token')?.value;
  const userRole = request.cookies.get('sb-user-role')?.value;

  // -----------------------------------------------------------------------
  // 1. ROOT PATH (/) — redirect based on auth status
  //    Logged in  → their dashboard
  //    Logged out → /login
  // -----------------------------------------------------------------------
  if (pathname === '/') {
    if (token && userRole && ROLE_TO_PATH[userRole]) {
      return NextResponse.redirect(new URL(ROLE_TO_PATH[userRole], request.url));
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // -----------------------------------------------------------------------
  // 2. LOGIN PAGE — if already logged in, redirect to their dashboard
  // -----------------------------------------------------------------------
  if (pathname === '/login') {
    if (token && userRole && ROLE_TO_PATH[userRole]) {
      return NextResponse.redirect(new URL(ROLE_TO_PATH[userRole], request.url));
    }
    return NextResponse.next();
  }

  // -----------------------------------------------------------------------
  // 3. DASHBOARD ROUTES — enforce auth + RBAC via cookies only
  //
  //    NOTE: Supabase JWT network verification is intentionally NOT done here.
  //    Next.js middleware runs in Edge Runtime which is incompatible with
  //    the full @supabase/supabase-js client (uses Node.js APIs like
  //    process.version). Calling supabase.auth.getUser() in middleware
  //    causes silent Edge Runtime failures → cookies get deleted →
  //    redirect loop between /login and the dashboard.
  //
  //    Route protection relies on the presence of custom cookies
  //    (sb-access-token + sb-user-role) set by the login page.
  //    Actual JWT validity is enforced per-page: if the token is expired,
  //    the first Supabase query on that page will return an auth error,
  //    which the page handles by showing an error banner.
  // -----------------------------------------------------------------------
  const matchedRoute = DASHBOARD_ROUTES.find(route => pathname.startsWith(route.prefix));

  if (matchedRoute) {
    // 3a. No token cookie at all → go to login
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // 3b. RBAC: role cookie must match the required role for this route.
    //     If mismatch, redirect to the correct dashboard for their role
    //     (or /login if role is unrecognised).
    if (!userRole || userRole !== matchedRoute.role) {
      const correctPath = userRole ? (ROLE_TO_PATH[userRole] ?? '/login') : '/login';
      return NextResponse.redirect(new URL(correctPath, request.url));
    }

    // 3c. Cookie checks passed — allow through
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/pengampu/:path*',
    '/orangtua/:path*',
    '/koordinator/:path*',
    '/kepalasekolah/:path*',
    '/stafftu/:path*',
  ],
};
