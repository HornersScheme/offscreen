import { createClient } from '@/lib/supabase/server';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ message: 'Invalid request.' }, { status: 403 });
  }

  let email = '';
  let password = '';
  try {
    const body = await request.json() as { email?: unknown; password?: unknown };
    email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    password = typeof body.password === 'string' ? body.password : '';
  } catch {
    return Response.json({ message: 'Enter a valid email and password.' }, { status: 400 });
  }

  if (email.length > 254 || !emailPattern.test(email) || password.length < 8 || password.length > 128) {
    return Response.json({ message: 'Use a valid email and a password between 8 and 128 characters.' }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${new URL(request.url).origin}/auth/callback`,
      },
    });

    if (error) {
      return Response.json({ message: 'Unable to create an account. Try signing in or resetting your password.' }, { status: 400 });
    }

    if (data.session) {
      return Response.json({ message: 'Account created.', signedIn: true });
    }

    return Response.json({
      message: 'Check your inbox to confirm your email. After confirmation, your sponsor access may still need approval.',
      signedIn: false,
    });
  } catch {
    return Response.json({ message: 'Signup is temporarily unavailable. Please try again.' }, { status: 503 });
  }
}
