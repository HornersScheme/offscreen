import { createClient } from '@/lib/supabase/server';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let email = '';
  try {
    const body = await request.json() as { email?: unknown };
    email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  } catch {
    return Response.json({ message: 'Enter a valid sponsor email.' }, { status: 400 });
  }

  if (email.length > 254 || !emailPattern.test(email)) {
    return Response.json({ message: 'Enter a valid sponsor email.' }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${new URL(request.url).origin}/auth/callback?next=/account/password`,
    });

    // Always return the same response so registered sponsor emails are not disclosed.
    return Response.json({ message: 'If this email is authorized, a reset link is on its way.' });
  } catch {
    return Response.json({ message: 'Password recovery is temporarily unavailable.' }, { status: 503 });
  }
}
