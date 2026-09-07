import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  const destination = request.nextUrl.clone();
  destination.search = '';

  if (code) {
    try {
      const supabase = await createClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        destination.pathname = '/dashboard';
        destination.searchParams.set('signed_in', '1');
        return NextResponse.redirect(destination);
      }
    } catch {
      // Fall through to the generic expired-link state.
    }
  }

  destination.pathname = '/login';
  destination.searchParams.set('error', 'link');
  return NextResponse.redirect(destination);
}
