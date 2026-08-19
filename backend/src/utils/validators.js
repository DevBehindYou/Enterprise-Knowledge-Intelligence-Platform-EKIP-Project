// Small, dependency-free input validators shared across controllers.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Server-side password policy — this must exist independently of whatever
 * Supabase's own default happens to be configured to (which is external,
 * changeable, and shouldn't be the only gate). Minimum 8 characters plus at
 * least one letter and one number; deliberately not requiring symbols, which
 * research on password policies shows pushes users toward predictable
 * substitutions (e.g. "Password1!") rather than meaningfully stronger secrets.
 */
export function validatePassword(password) {
  if (typeof password !== 'string' || password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (password.length > 128) {
    return 'Password must be under 128 characters long.';
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must include at least one letter and one number.';
  }
  return null; // valid
}

export function validateEmail(email) {
  if (typeof email !== 'string' || !EMAIL_RE.test(email)) {
    return 'Please provide a valid email address.';
  }
  return null; // valid
}
