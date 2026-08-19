// Central place that reads process.env once and fails fast if something
// critical is missing, instead of surfacing a confusing error deep in a request.

const required = (name, fallback = undefined) => {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    // eslint-disable-next-line no-console
    console.warn(`[env] ${name} is not set — some functionality will be degraded until it is.`);
  }
  return value;
};

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  frontendOrigin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',

  supabaseUrl: required('SUPABASE_URL'),
  supabaseAnonKey: required('SUPABASE_ANON_KEY'),
  supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),

  mongodbUri: required('MONGODB_URI'),
  mongodbDbName: process.env.MONGODB_DB_NAME || 'ekip',
  vectorIndexName: process.env.VECTOR_INDEX_NAME || 'chunk_vector_index',
  vectorDimensions: Number(
    process.env.VECTOR_DIMENSIONS || 
    (process.env.EMBEDDING_PROVIDER === 'ollama' && (process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text') === 'nomic-embed-text' ? 768 : 1536)
  ),

  appJwtSecret: required('APP_JWT_SECRET', 'dev-only-insecure-secret-change-me'),
  appJwtExpiresIn: process.env.APP_JWT_EXPIRES_IN || '15m',
  refreshTokenExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
  refreshCookieName: process.env.REFRESH_COOKIE_NAME || 'ekip_rt',
  refreshCookieDomain: process.env.REFRESH_COOKIE_DOMAIN || 'localhost',

  llmProvider: process.env.LLM_PROVIDER || 'openai',
  embeddingProvider: process.env.EMBEDDING_PROVIDER || 'openai',
  openaiApiKey: process.env.OPENAI_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  ollamaModel: process.env.OLLAMA_MODEL || 'llama3.1:8b',
  // Required whenever OLLAMA_BASE_URL points at Ollama Cloud (https://ollama.com) —
  // unauthenticated requests to it 404 instead of returning 401.
  ollamaApiKey: process.env.OLLAMA_API_KEY,
  // Embeddings are configured separately from chat (above): confirmed against the
  // live API that Ollama Cloud's key only authorizes /api/chat, not /api/embed
  // (401 regardless of model) — its catalog is chat-models-only. So embeddings need
  // their own, typically-local, Ollama endpoint rather than reusing OLLAMA_BASE_URL.
  ollamaEmbeddingBaseUrl: process.env.OLLAMA_EMBEDDING_BASE_URL || 'http://localhost:11434',
  ollamaEmbeddingModel: process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text',
  ollamaEmbeddingApiKey: process.env.OLLAMA_EMBEDDING_API_KEY,

  // Google Gemini embeddings (EMBEDDING_PROVIDER=gemini) — the free-tier-friendly
  // hosted option: no local model, just an outbound HTTPS call. gemini-embedding-001
  // supports Matryoshka output sizes, so we request VECTOR_DIMENSIONS (1536) and the
  // existing Atlas index needs no change. Key: https://aistudio.google.com/app/apikey.
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiEmbeddingBaseUrl: process.env.GEMINI_EMBEDDING_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta',
  geminiEmbeddingModel: process.env.GEMINI_EMBEDDING_MODEL || 'gemini-embedding-001',

  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  defaultTenantId: process.env.DEFAULT_TENANT_ID || '000000000000000000000001',

  // Express's rate limiter keys off req.ip, which is only meaningful if Express
  // knows how many reverse-proxy hops to trust when reading X-Forwarded-For.
  // Defaults to NOT trusting any hop — safe when unsure, but this means
  // rate limiting will key off the load balancer's IP (i.e. be ineffective)
  // in a typical production deployment. Set TRUST_PROXY=1 explicitly once you
  // know your exact topology (e.g. "1" behind a single ALB/Nginx hop) — see
  // the Deployment Guide, "Reverse proxy & rate limiting" section.
  trustProxy: process.env.TRUST_PROXY ? Number(process.env.TRUST_PROXY) : false,
};
