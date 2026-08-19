# EKIP Backend

Node.js + Express API — auth bridge (Supabase → app JWT + HttpOnly cookie), RAG pipeline
(ingestion/retrieval/generation over MongoDB Atlas Vector Search), and admin/governance endpoints.

## Setup

```bash
npm install
cp ../.env.example .env   # then fill in real values
node scripts/create-vector-index.js   # one-time: creates the Atlas Vector Search index
npm run dev
```

Requires: a MongoDB Atlas cluster (M10+ recommended for Vector Search in production, free tier
works for local dev), a Supabase project (Auth only — no Supabase tables are used), and an LLM/embedding
provider API key (OpenAI by default; see `LLM_PROVIDER`/`EMBEDDING_PROVIDER` in `.env`).

See `../docs/02-system-architecture.md` and `../docs/04-api-documentation.md` for the full design.
