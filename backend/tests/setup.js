// Runs before any test file, and before app.js (and everything it imports) —
// several modules construct clients (Supabase, Redis) at import time, so
// these need to exist before that first import happens, even as dummy values.
process.env.NODE_ENV = 'test';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'test-anon-key';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-role-key';
process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ekip-test';
process.env.APP_JWT_SECRET = process.env.APP_JWT_SECRET || 'test-secret-do-not-use-in-prod';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
