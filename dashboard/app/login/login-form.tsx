'use client';

import { FormEvent, useState } from 'react';

export function LoginForm({ initialMessage = '' }: { initialMessage?: string }) {
  const [message, setMessage] = useState(initialMessage);
  const [isError, setIsError] = useState(Boolean(initialMessage));
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage('');

    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/auth/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: form.get('email'),
          password: form.get('password'),
        }),
      });
      const result = await response.json() as { message?: string };
      if (response.ok) {
        window.location.assign('/dashboard?signed_in=1');
        return;
      }

      setIsError(true);
      setMessage(result.message || 'Email or password is incorrect.');
    } catch {
      setIsError(true);
      setMessage('Sign-in is temporarily unavailable. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="login-form" onSubmit={submit}>
      <label className="sr-only" htmlFor="email">Sponsor email</label>
      <input id="email" name="email" type="email" autoComplete="email" placeholder="you@company.com" maxLength={254} required />
      <label className="sr-only" htmlFor="password">Password</label>
      <input id="password" name="password" type="password" autoComplete="current-password" placeholder="Password" minLength={8} maxLength={128} required />
      <button type="submit" disabled={pending}>{pending ? 'Signing in…' : 'Sign in'}</button>
      <a className="login-help" href="/forgot-password">Forgot password?</a>
      <p className="form-message" role="status" data-error={isError}>{message}</p>
    </form>
  );
}
