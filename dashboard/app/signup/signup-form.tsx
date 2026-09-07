'use client';

import { FormEvent, useState } from 'react';

export function SignupForm() {
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage('');

    const form = new FormData(event.currentTarget);
    const password = String(form.get('password') || '');
    const confirmation = String(form.get('confirmation') || '');

    if (password !== confirmation) {
      setIsError(true);
      setMessage('The passwords do not match.');
      setPending(false);
      return;
    }

    try {
      const response = await fetch('/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.get('email'),
          password,
        }),
      });
      const result = await response.json() as { message?: string; signedIn?: boolean };

      if (response.ok && result.signedIn) {
        window.location.assign('/dashboard?signed_in=1');
        return;
      }

      setIsError(!response.ok);
      setMessage(result.message || 'Unable to create your account.');
      if (response.ok) event.currentTarget.reset();
    } catch {
      setIsError(true);
      setMessage('Signup is temporarily unavailable. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="login-form" onSubmit={submit}>
      <label className="sr-only" htmlFor="email">Sponsor email</label>
      <input id="email" name="email" type="email" autoComplete="email" placeholder="you@company.com" maxLength={254} required />
      <label className="sr-only" htmlFor="password">Password</label>
      <input id="password" name="password" type="password" autoComplete="new-password" placeholder="Password" minLength={8} maxLength={128} required />
      <label className="sr-only" htmlFor="confirmation">Confirm password</label>
      <input id="confirmation" name="confirmation" type="password" autoComplete="new-password" placeholder="Confirm password" minLength={8} maxLength={128} required />
      <button type="submit" disabled={pending}>{pending ? 'Creating account…' : 'Create account'}</button>
      <p className="form-message" role="status" data-error={isError}>{message}</p>
      <p className="login-secondary">Already have an account? <a href="/login">Sign in</a> · <a href="/resend-confirmation">Resend confirmation</a></p>
    </form>
  );
}
