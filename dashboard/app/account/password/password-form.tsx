'use client';

import { FormEvent, useState } from 'react';

export function PasswordForm() {
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
      const response = await fetch('/auth/password/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const result = await response.json() as { message?: string };
      setIsError(!response.ok);
      setMessage(result.message || (response.ok ? 'Password saved.' : 'Unable to save your password.'));
      if (response.ok) event.currentTarget.reset();
    } catch {
      setIsError(true);
      setMessage('Unable to save your password right now.');
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="account-form" onSubmit={submit}>
      <label className="sr-only" htmlFor="new-password">New password</label>
      <input id="new-password" name="password" type="password" autoComplete="new-password" placeholder="New password" minLength={8} maxLength={128} required />
      <label className="sr-only" htmlFor="confirm-password">Confirm new password</label>
      <input id="confirm-password" name="confirmation" type="password" autoComplete="new-password" placeholder="Confirm new password" minLength={8} maxLength={128} required />
      <button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save password'}</button>
      <p className="form-message" role="status" data-error={isError}>{message}</p>
    </form>
  );
}
