import { ResetForm } from './reset-form';

export default function ForgotPasswordPage() {
  return (
    <main className="login-shell">
      <a className="wordmark" href="https://offscreenapp.com" aria-label="Offscreen home">
        <span className="wordmark-mark" aria-hidden="true" />
        Offscreen
      </a>
      <section className="login-main" aria-labelledby="reset-title">
        <div>
          <p className="eyebrow">Sponsor dashboard</p>
          <h1 id="reset-title">Reset your password.</h1>
          <p className="login-copy">Enter your sponsor email and we’ll send you a secure reset link.</p>
          <ResetForm />
        </div>
      </section>
      <footer className="login-footer">Private reporting for Offscreen pilot partners.</footer>
    </main>
  );
}
