import type { AuthError } from '@supabase/supabase-js';

type AuthAction = 'signup' | 'signin' | 'recovery' | 'confirmation' | 'password';

export function authErrorResult(error: AuthError, action: AuthAction) {
  const code = error.code || 'unknown';

  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit') {
    return { status: 429, message: 'Too many email requests were sent. Please wait about an hour before trying again.' };
  }

  if (code === 'weak_password') {
    return { status: 400, message: 'Choose a stronger password with at least eight characters.' };
  }

  if (code === 'email_not_confirmed') {
    return { status: 403, message: 'Confirm your email before signing in. You can resend the confirmation below.' };
  }

  if (code === 'same_password') {
    return { status: 400, message: 'Choose a password you have not used for this account.' };
  }

  if (code === 'reauthentication_needed') {
    return { status: 403, message: 'For security, request a fresh password-reset email and try again.' };
  }

  if (code === 'email_provider_disabled' || code === 'signup_disabled') {
    return { status: 503, message: 'Email account creation is currently disabled.' };
  }

  const fallback: Record<AuthAction, string> = {
    signup: 'Unable to create an account. Try signing in or resetting your password.',
    signin: 'Email or password is incorrect.',
    recovery: 'Unable to send a password-reset email right now.',
    confirmation: 'Unable to resend the confirmation email right now.',
    password: 'Unable to save that password.',
  };

  return { status: error.status || 400, message: fallback[action] };
}

export function logAuthError(action: AuthAction, error: AuthError) {
  console.error(`[auth/${action}] Supabase Auth error`, {
    code: error.code || 'unknown',
    status: error.status,
  });
}
