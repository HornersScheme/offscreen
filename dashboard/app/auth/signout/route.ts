import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    if (data?.claims?.sub) await supabase.auth.signOut();
  } catch {
    // Always return to login, including when a session is already expired.
  }

  return NextResponse.redirect(new URL('/login', request.url), { status: 303 });
}
