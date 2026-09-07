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
    await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${new URL(request.url).origin}/auth/callback`,
        shouldCreateUser: false,
      },
    });

    // Return the same result whether or not the email is registered to prevent account enumeration.
    return Response.json({ message: 'If this email is authorized, a sign-in link is on its way.' });
  } catch {
    return Response.json({ message: 'Sign-in is temporarily unavailable. Please try again.' }, { status: 503 });
  }
}
