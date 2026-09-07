import { ResendForm } from './resend-form';

export default function ResendConfirmationPage() {
  return (
    <main className="login-shell">
      <a className="wordmark" href="https://offscreenapp.com" aria-label="Offscreen home">
        <span className="wordmark-mark" aria-hidden="true" />
        Offscreen
      </a>
      <section className="login-main" aria-labelledby="confirmation-title">
        <div>
          <p className="eyebrow">Sponsor dashboard</p>
          <h1 id="confirmation-title">Confirm your email.</h1>
          <p className="login-copy">If your signup is still waiting for confirmation, request a fresh link here.</p>
          <ResendForm />
        </div>
      </section>
      <footer className="login-footer">Private reporting for Offscreen pilot partners.</footer>
    </main>
  );
}
