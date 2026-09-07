import { createClient } from '@/lib/supabase/server';
import { authErrorResult, logAuthError } from '@/lib/supabase/auth-errors';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ message: 'Invalid request.' }, { status: 403 });
  }

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
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${new URL(request.url).origin}/auth/callback`,
      },
    });

    if (error) {
      logAuthError('confirmation', error);
      const result = authErrorResult(error, 'confirmation');
      return Response.json({ message: result.message }, { status: result.status });
    }

    return Response.json({ message: 'If confirmation is pending, a new email is on its way.' });
  } catch {
    return Response.json({ message: 'Unable to resend the confirmation email right now.' }, { status: 503 });
  }
}
