import { createClient } from '@/lib/supabase/server';
import { authErrorResult, logAuthError } from '@/lib/supabase/auth-errors';

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return Response.json({ message: 'Invalid request.' }, { status: 403 });
  }

  let password = '';
  try {
    const body = await request.json() as { password?: unknown };
    password = typeof body.password === 'string' ? body.password : '';
  } catch {
    return Response.json({ message: 'Enter a valid password.' }, { status: 400 });
  }

  if (password.length < 8 || password.length > 128) {
    return Response.json({ message: 'Use a password between 8 and 128 characters.' }, { status: 400 });
  }

  try {
    const supabase = await createClient();
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
    if (claimsError || typeof claimsData?.claims?.sub !== 'string') {
      return Response.json({ message: 'Your session has expired. Sign in again.' }, { status: 401 });
    }

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      logAuthError('password', error);
      const result = authErrorResult(error, 'password');
      return Response.json({ message: result.message }, { status: result.status });
    }

    return Response.json({ message: 'Password saved. You can now use it to sign in.' });
  } catch {
    return Response.json({ message: 'Unable to save your password right now.' }, { status: 503 });
  }
}
