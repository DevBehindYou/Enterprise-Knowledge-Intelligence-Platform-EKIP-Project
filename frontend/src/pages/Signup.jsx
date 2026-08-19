import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell from '../components/layout/AuthShell.jsx';
import Input from '../components/foundations/Input.jsx';
import Button from '../components/foundations/Button.jsx';
import { useAuthViewModel } from '../viewmodels/useAuthViewModel.js';

export default function Signup() {
  const [form, setForm] = useState({ name: '', email: '', password: '', department: 'Unassigned' });
  const { isSubmitting, error, handleSignup } = useAuthViewModel();
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    const success = await handleSignup(form);
    if (success) navigate('/login', { state: { justSignedUp: true } });
  }

  return (
    <AuthShell>
      <p className="text-ink-muted text-[13px] -mt-4 mb-6">Create your account</p>
      <form onSubmit={onSubmit}>
        <Input label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <Input
          label="Work email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          hint="Only your company domain can self-register. Other domains need an admin invite."
          required
        />
        <Input
          label="Password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          placeholder="Minimum 8 characters"
          minLength={8}
          required
        />
        {error && <div className="text-danger text-[12.5px] mb-3">{error}</div>}
        <Button type="submit" className="w-full mt-2" loading={isSubmitting}>
          Create account
        </Button>
      </form>
      <hr className="border-line my-6" />
      <p className="text-center text-[12.5px] text-ink-muted">
        Already have an account?{' '}
        <Link to="/login" className="text-accent font-semibold">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
