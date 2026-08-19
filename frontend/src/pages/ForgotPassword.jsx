import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthShell from '../components/layout/AuthShell.jsx';
import Input from '../components/foundations/Input.jsx';
import Button from '../components/foundations/Button.jsx';
import { useAuthViewModel } from '../viewmodels/useAuthViewModel.js';
import { useBackendHealth } from '../context/BackendHealthContext.jsx';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const { isSubmitting, error, handleForgotPassword } = useAuthViewModel();
  const { isWarming } = useBackendHealth();

  async function onSubmit(e) {
    e.preventDefault();
    const success = await handleForgotPassword(email);
    if (success) setSent(true);
  }

  return (
    <AuthShell>
      <h2 className="text-lg font-semibold mb-1.5">Reset your password</h2>
      {sent ? (
        <p className="text-[13px] text-ink-muted">
          If an account exists for <strong>{email}</strong>, we've sent a link to reset your password.
        </p>
      ) : (
        <>
          <p className="text-[13px] text-ink-muted mb-5">Enter your work email and we'll send a link to reset your password.</p>
          <form onSubmit={onSubmit}>
            <Input label="Work email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            {error && <div className="text-danger text-[12.5px] mb-3">{error}</div>}
            <Button type="submit" className="w-full" loading={isSubmitting} disabled={isSubmitting || isWarming}>
              {isWarming ? "Waking up server..." : "Send reset link"}
              </Button>
          </form>
        </>
      )}
      <div className="h-px bg-line my-6" />
      <Link to="/login" className="text-[12.5px] text-ink-muted font-semibold">
        ← Back to log in
      </Link>
    </AuthShell>
  );
}
