import { createClient } from '@/lib/supabase/server';
import { authErrorResult, logAuthError } from '@/lib/supabase/auth-errors';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let email = '';
  let password = '';

  try {
    const body = await request.json() as { email?: unknown; password?: unknown };
    email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    password = typeof body.password === 'string' ? body.password : '';
  } catch {
    return Response.json({ message: 'Enter your email and password.' }, { status: 400 });
  }

  if (email.length > 254 || !emailPattern.test(email) || password.length < 8 || password.length > 128) {
    return Response.json({ message: 'Enter a valid email and password.' }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      logAuthError('signin', error);
      const result = authErrorResult(error, 'signin');
      return Response.json({ message: result.message }, { status: result.status });
    }

    return Response.json({ message: 'Signed in.' });
  } catch {
    return Response.json({ message: 'Sign-in is temporarily unavailable. Please try again.' }, { status: 503 });
  }
}
