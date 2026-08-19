import { createClient } from '@supabase/supabase-js';

// NOTE: this client is not used for authentication in EKIP — login/signup/refresh
// all go through the Express backend (see docs/02-system-architecture.md §4), which
// is what actually talks to Supabase server-side with the service-role key.
// This client is kept available for any future direct-to-Supabase reads the
// frontend might need (none in v1), so it's configured but unused by authService.js.
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
