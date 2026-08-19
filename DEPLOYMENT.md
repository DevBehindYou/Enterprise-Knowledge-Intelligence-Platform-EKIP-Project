# EKIP — Free-Tier Deployment Guide

A fully-free hosting split:

| Piece | Service | Free tier |
|---|---|---|
| Frontend (Vite/React) | **Vercel** | Static hosting |
| Backend API + ingestion worker | **Render** | Web service (spins down after ~15 min idle) |
| Database + vector search | **MongoDB Atlas M0** | 512 MB, Vector Search included |
| Queue | **Upstash Redis** | Free tier |
| Object storage | **Supabase Storage** | Configured in-app (Settings → Storage), S3-compatible |
| Chat LLM | **Ollama Cloud** | Free tier |
| Embeddings | **Google Gemini** | 1,500 req/day, no credit card |

Everything is env-driven; no code changes are needed to deploy.

---

## 1. Prerequisites (create the free accounts / resources)

1. **MongoDB Atlas M0** cluster. Then create the vector index — from `backend/`:
   ```bash
   node scripts/create-vector-index.js
   ```
   (Run it once, with `backend/.env` filled in, before the first document upload.)
2. **Upstash Redis** database → copy its `rediss://` URL.
3. **Supabase** project (you already use it for auth). For file storage: Storage → S3 Connection → enable, create an access key pair. You'll enter these later in the app UI, not in env.
4. **Ollama Cloud** key → https://ollama.com/settings/keys (chat).
5. **Gemini** key → https://aistudio.google.com/app/apikey — must start with `AIza…` (embeddings).

---

## 2. Backend on Render

1. Push this repo to GitHub.
2. Render Dashboard → **New → Blueprint** → select the repo. It reads `render.yaml`
   (service `ekip-backend`, root `backend`, health check `/api/health`).
3. Fill in every `sync: false` env var in the service's **Environment** tab. Use
   `backend/.env.example` as the checklist. Key production values:
   - `NODE_ENV=production`, `TRUST_PROXY=1`, `RUN_INLINE_WORKER=true` (already in the blueprint)
   - `FRONTEND_ORIGIN=https://<your-app>.vercel.app` (set after step 3, no trailing slash)
   - `REFRESH_COOKIE_DOMAIN=` **left blank**
   - `EMBEDDING_PROVIDER=gemini`, `GEMINI_API_KEY=AIza…`
4. Deploy. Note the URL, e.g. `https://ekip-backend.onrender.com`.

> **Cold starts:** the free web service sleeps after ~15 min idle; the first
> request then takes ~50s. A free pinger (e.g. cron-job.org hitting
> `/api/health` every 10 min) keeps it warm. Because `RUN_INLINE_WORKER=true`,
> document ingestion only progresses while the service is awake.

---

## 3. Frontend on Vercel

1. Vercel → **New Project** → import the repo → set **Root Directory = `frontend`**
   (`frontend/vercel.json` handles the Vite build + SPA rewrites).
2. Environment Variables:
   - `VITE_API_BASE_URL=https://ekip-backend.onrender.com/api`  ← the Render URL + `/api`
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
3. Deploy, then copy the Vercel URL back into Render's `FRONTEND_ORIGIN` and redeploy the backend.

---

## 4. Post-deploy checklist

- [ ] `GET https://<backend>/api/health` returns OK.
- [ ] Log in from the Vercel site → a `ekip_rt` cookie appears with `Secure; SameSite=None`.
      If login "works but you're logged out on refresh", `FRONTEND_ORIGIN`,
      `NODE_ENV=production`, or a stray `REFRESH_COOKIE_DOMAIN` is the cause.
- [ ] Settings → Storage → add **Supabase Storage** and activate it.
- [ ] Settings → AI Integration → confirm the chat provider tests green.
- [ ] Upload a document → after a few seconds it becomes searchable → ask a chat
      question and get a cited answer (verifies Gemini embeddings + Atlas vector search).

---

## Scaling past free tier (later)

- Replace `RUN_INLINE_WORKER=true` with a dedicated Render **worker** service
  running `npm run worker`, so ingestion runs even when the API is idle.
- Upgrade the Render web service off free to remove cold starts.
- Swap Supabase Storage for any S3-compatible provider in Settings — no redeploy.
