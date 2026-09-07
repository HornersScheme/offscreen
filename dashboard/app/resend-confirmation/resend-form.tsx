'use client';

import { FormEvent, useState } from 'react';

export function ResendForm() {
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage('');

    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch('/auth/confirmation/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.get('email') }),
      });
      const result = await response.json() as { message?: string };
      setIsError(!response.ok);
      setMessage(result.message || 'If confirmation is pending, a new email is on its way.');
    } catch {
      setIsError(true);
      setMessage('Unable to resend the confirmation email right now.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="login-form" onSubmit={submit}>
      <label className="sr-only" htmlFor="email">Sponsor email</label>
      <input id="email" name="email" type="email" autoComplete="email" placeholder="you@company.com" maxLength={254} required />
      <button type="submit" disabled={pending}>{pending ? 'Sending…' : 'Resend confirmation'}</button>
      <a className="login-help" href="/login">Back to sign in</a>
      <p className="form-message" role="status" data-error={isError}>{message}</p>
    </form>
  );
}
