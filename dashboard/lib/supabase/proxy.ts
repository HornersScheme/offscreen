import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseConfig } from './config';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  try {
    const { url, key } = getSupabaseConfig();
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headersToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headersToSet).forEach(([name, value]) => response.headers.set(name, value));
        },
      },
    });

    const { data } = await supabase.auth.getClaims();
    const signedIn = Boolean(data?.claims?.sub);
    const onDashboard = request.nextUrl.pathname.startsWith('/dashboard');
    const onAuthPage = ['/login', '/signup', '/forgot-password'].includes(request.nextUrl.pathname);

    if (!signedIn && onDashboard) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (signedIn && onAuthPage) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  } catch {
    if (request.nextUrl.pathname.startsWith('/dashboard')) {
      return NextResponse.redirect(new URL('/login?error=config', request.url));
    }
  }

  return response;
}
