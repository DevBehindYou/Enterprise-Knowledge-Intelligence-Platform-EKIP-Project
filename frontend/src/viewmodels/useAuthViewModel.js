import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';

/**
 * ViewModel for the Login/Signup/Forgot-password Views. Holds per-form
 * submission state; the actual session state lives in AuthContext (global).
 */
export function useAuthViewModel() {
  const { login, signup, forgotPassword } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  async function handleLogin(email, password) {
    setIsSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      return true;
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Something went wrong. Please try again.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignup(payload) {
    setIsSubmitting(true);
    setError(null);
    try {
      await signup(payload);
      return true;
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Something went wrong. Please try again.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleForgotPassword(email) {
    setIsSubmitting(true);
    setError(null);
    try {
      await forgotPassword(email);
      return true;
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Something went wrong. Please try again.');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }

  return { isSubmitting, error, handleLogin, handleSignup, handleForgotPassword };
}
