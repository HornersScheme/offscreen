import { SignupForm } from './signup-form';

export default function SignupPage() {
  return (
    <main className="login-shell">
      <a className="wordmark" href="https://offscreenapp.com" aria-label="Offscreen home">
        <span className="wordmark-mark" aria-hidden="true" />
        Offscreen
      </a>
      <section className="login-main" aria-labelledby="signup-title">
        <div>
          <p className="eyebrow">Sponsor dashboard</p>
          <h1 id="signup-title">Create your sponsor login.</h1>
          <p className="login-copy">After confirming your email, an Offscreen administrator will connect your account to your organization.</p>
          <SignupForm />
        </div>
      </section>
      <footer className="login-footer">Private reporting for Offscreen pilot partners.</footer>
    </main>
  );
}
