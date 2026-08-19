import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import AuthShell from '../components/layout/AuthShell.jsx';
import Input from '../components/foundations/Input.jsx';
import Button from '../components/foundations/Button.jsx';
import { useAuthViewModel } from '../viewmodels/useAuthViewModel.js';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { isSubmitting, error, handleLogin } = useAuthViewModel();
  const navigate = useNavigate();
  const location = useLocation();

  async function onSubmit(e) {
    e.preventDefault();
    const success = await handleLogin(email, password);
    if (success) navigate(location.state?.from || '/', { replace: true });
  }

  return (
    <AuthShell>
      <p className="text-ink-muted text-[13px] -mt-4 mb-6">Enterprise Knowledge Intelligence Platform</p>
      
      <div className="bg-surface-elevated border border-line rounded-lg p-3 mb-5 text-[12.5px] text-ink-muted">
        <p className="font-semibold text-ink mb-1">Demo Account:</p>
        <p>Email: <span className="font-mono text-ink">demo@ekip.com</span></p>
        <p>Password: <span className="font-mono text-ink">demo@1234</span></p>
      </div>

      <form onSubmit={onSubmit}>
        <Input label="Work email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="demo@ekip.com" required />
        <Input label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="â€¢â€¢â€¢â€¢â€¢â€¢â€¢â€¢" required />
        {error && <div className="text-danger text-[12.5px] mb-3">{error}</div>}
        <Link to="/forgot-password" className="text-[12.5px] text-accent font-semibold">
          Forgot password?
        </Link>
        <Button type="submit" className="w-full mt-5" loading={isSubmitting}>
          Log in
        </Button>
      </form>
      <hr className="border-line my-6" />
      <p className="text-center text-[12.5px] text-ink-muted">
        Don't have an account?{' '}
        <Link to="/signup" className="text-accent font-semibold">
          Request access
        </Link>
      </p>
    </AuthShell>
  );
}

