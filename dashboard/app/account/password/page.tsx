import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PasswordForm } from './password-form';

export default async function PasswordPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || typeof data?.claims?.sub !== 'string') redirect('/login');

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <a className="wordmark" href="https://offscreenapp.com" aria-label="Offscreen home">
          <span className="wordmark-mark" aria-hidden="true" />
          Offscreen <span className="wordmark-section">/ Sponsors</span>
        </a>
        <a className="account-back" href="/dashboard">Back to dashboard</a>
      </header>
      <section className="state-panel">
        <p className="eyebrow">Account security</p>
        <h1>Set your password.</h1>
        <p>Use at least eight characters. You’ll use this password with your sponsor email when you sign in.</p>
        <PasswordForm />
      </section>
    </main>
  );
}
