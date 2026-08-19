# EKIP — Enterprise Knowledge Intelligence Platform

An enterprise RAG assistant: employees ask questions in plain language and get answers grounded in
company documents, always with a citation and a confidence score — never a black box.

**Stack:** React (Vite, JavaScript) + Tailwind CSS · Node.js + Express · MongoDB Atlas (+ Atlas Vector
Search) · Supabase Auth (JWT + HttpOnly refresh cookie, bridged through Express).

## What's in this repo

```
ekip/
├── frontend/     React + Vite + Tailwind SPA, MVVM-organized (see docs/02 §2)
├── backend/      Node.js + Express API — auth bridge, RAG pipeline, admin/governance endpoints
├── docs/         Full documentation set (BRD/SRS, architecture, DB schema, API contract,
│                 UI/UX design system, page inventory, component library, roadmap)
├── docker-compose.yml
└── .env.example
```

## Quick start

1. **Provision the externals** — you'll need:
   - A [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (free tier is fine for dev; Vector
     Search requires Atlas, not a bare `mongod`).
   - A [Supabase](https://supabase.com) project (Auth only — no Supabase tables are used).
   - An LLM/embedding API key (OpenAI by default — see `.env.example` to swap providers).
   - **Redis** (for the ingestion job queue) — `docker run -p 6379:6379 redis:7-alpine` is enough for dev.

2. **Backend**
   ```bash
   cd backend
   npm install
   cp ../.env.example .env   # fill in real values
   node scripts/create-vector-index.js   # one-time: creates the Atlas Vector Search index
   npm run dev               # API on http://localhost:4000
   npm run worker            # separate process: consumes the ingestion queue
   ```

3. **Frontend**
   ```bash
   cd frontend
   npm install
   cp .env.example .env      # fill in Supabase anon key/URL
   npm run dev               # http://localhost:5173
   ```

4. Open `http://localhost:5173`, sign up, and — as an admin — upload a document from
   **Admin Console → Documents** to see the full ingest → ask → cite loop. Watch progress live on
   **Admin Console → System Health**, which reads directly from the BullMQ queue.

Or, once both `.env` files are filled in: `docker compose up` from the repo root (starts the API,
the worker, the frontend dev server, and Redis together).

## Running the tests

Both halves have a real test suite (Vitest) — not smoke tests, actual coverage of the pieces that
matter most: permission resolution, the RAG answer pipeline's grounding logic, auth middleware, and
the signature UI components.

```bash
cd backend && npm install && npm test     # unit tests (mocked Mongo/providers) + an integration
                                            # pass over the Express app with a mocked Supabase client
cd frontend && npm install && npm test    # component tests (RTL) + ViewModel hook tests
```

Nothing in the suite touches a real database, Redis instance, or external API — everything network-
or DB-shaped is mocked, so `npm test` is fast and deterministic in CI.

## Scanned documents & PPTX — how they're actually handled

- **Scanned/image-only PDFs** are auto-detected during extraction (near-zero extractable text per
  page) and routed through OCR automatically — `pdf2pic` rasterizes each page (needs GraphicsMagick
  + Ghostscript; already in `backend/Dockerfile` for the containerized path — install both locally
  too if running the backend outside Docker), then `tesseract.js` reads the text off each page image.
- **`.pptx` extraction** reads slide XML directly out of the OOXML zip (via `jszip`) rather than
  depending on an external pptx-parsing package — it's a small, self-contained piece of code you can
  read end-to-end in `backend/src/services/rag/pptxExtraction.js`.
- **Ingestion runs through a real BullMQ queue**, not a fire-and-forget async call — uploads return
  immediately, and a separate worker process (`npm run worker`) does the extract/chunk/embed/index
  work, retrying failed jobs automatically (3 attempts, exponential backoff).

## What's still a deliberate stub

- **`GET /api/ingestion/queue`** is implemented and wired into the System Health page, but there's no
  push/websocket update — it's poll-on-refresh. Fine for an admin console; upgrade to SSE or
  websockets if you want it live.
- **Multi-tenancy** — every collection carries `tenantId` and every query filters on it, but there's
  no tenant-provisioning flow yet (single default tenant, per `DEFAULT_TENANT_ID`). See
  `docs/08-roadmap-and-repo-structure.md` Phase 3.
- **SSO/SAML** is not implemented — Supabase Auth is email/password only in this build.

## Security

This codebase has been through an adversarial security review — see `docs/09-security-audit-report.docx`
for the full write-up. Nine findings (one Critical: a JWT token-type-confusion bug letting a refresh
token function as a full access token) were identified via sandboxed dynamic testing against the real
source, fixed, and re-verified. Before handling real production data, also read
`docs/10-deployment-guide.docx` and `docs/11-credentials-and-secrets-management.docx`, and action the
"Before production launch" items in the audit report (in particular: run `npm audit` and a real
penetration test against a staged deployment — neither was possible from the sandboxed environment
this review was performed in).

## Where to go next

- `docs/08-roadmap-and-repo-structure.md` — phased roadmap (this repo implements Phase 1 + most of
  Phase 2; Phase 3 items are flagged above).
- `docs/02-system-architecture.md` — the MVVM pattern, auth flow, and RAG pipeline in full.
- `docs/04-api-documentation.md` — the API contract this frontend is built against.
