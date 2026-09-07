import { LoginForm } from './login-form';

type Props = { searchParams: Promise<{ error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { error } = await searchParams;
  const initialMessage = error === 'link'
    ? 'That sign-in link is invalid or expired. Request a new one.'
    : error === 'config'
      ? 'The dashboard is not configured yet.'
      : '';

  return (
    <main className="login-shell">
      <a className="wordmark" href="https://offscreenapp.com" aria-label="Offscreen home">
        <span className="wordmark-mark" aria-hidden="true" />
        Offscreen
      </a>
      <section className="login-main" aria-labelledby="login-title">
        <div>
          <p className="eyebrow">Sponsor dashboard</p>
          <h1 id="login-title">See what your support made possible.</h1>
          <p className="login-copy">Sign in with your sponsor email to view campaign performance.</p>
          <LoginForm initialMessage={initialMessage} />
        </div>
      </section>
      <footer className="login-footer">Private reporting for Offscreen pilot partners.</footer>
    </main>
  );
}
