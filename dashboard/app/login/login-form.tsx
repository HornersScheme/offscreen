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
      const response = await fetch('/auth/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.get('email') }),
      });
      const result = await response.json() as { message?: string };
      setIsError(!response.ok);
      setMessage(result.message || (response.ok ? 'Check your inbox for a secure sign-in link.' : 'Unable to send a sign-in link.'));
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
      <button type="submit" disabled={pending}>{pending ? 'Sending…' : 'Send sign-in link'}</button>
      <p className="form-message" role="status" data-error={isError}>{message}</p>
    </form>
  );
}
