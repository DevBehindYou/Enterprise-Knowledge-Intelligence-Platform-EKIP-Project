# EKIP — Roadmap & Repository Structure

## 1. Phased roadmap

### Phase 1 — MVP (weeks 1–4)
Goal: prove the core loop — upload a document, ask a question, get a cited answer.

- [ ] Supabase Auth wired end-to-end (signup/login/logout, Express session bridge per `02-system-architecture.md §4`)
- [ ] MongoDB Atlas cluster provisioned, base collections + vector index created (`03-database-schema.md`)
- [ ] PDF upload → ingestion pipeline (extraction → chunk → embed → index)
- [ ] Chat interface with streaming answers + Citation Chips
- [ ] Basic role check (employee vs admin only; manager role stubbed)
- **Done when:** the Phase 1 acceptance criteria in `01-brd-srs.md §4` all pass.

### Phase 2 (weeks 5–8)
Goal: make it feel like an enterprise product, not a demo.

- [ ] Full RBAC (employee/manager/admin) + department scoping
- [ ] Document Management admin console (upload metadata, reprocess, delete)
- [ ] Permissions Matrix page + `document_permissions` overrides
- [ ] Conversation history (rename/archive/delete)
- [ ] Document Summarizer
- [ ] Feedback (👍/👎) wired to `feedback_events`
- [ ] Audit logging live across auth, document, and permission actions

### Phase 3 (weeks 9–16)
Goal: enterprise-scale hardening.

- [ ] Multi-tenancy (`tenantId` filters proven under a second test tenant)
- [ ] Manager Analytics dashboard
- [ ] Evaluation pipeline (retrieval precision sampling, hallucination review queue)
- [ ] OCR path for scanned PDFs
- [ ] System Health / ingestion queue monitor
- [ ] Cloud deployment (load balancer, orchestration, autoscaling) — see `02-system-architecture.md §8`
- [ ] SSO/SAML groundwork (Phase 3 stretch, per `01-brd-srs.md §5`)

## 2. Repository structure

```
ekip/
├── frontend/                     # React (Vite) + Tailwind — see 02-system-architecture.md §2.1
│   ├── src/
│   │   ├── models/
│   │   ├── services/
│   │   ├── viewmodels/
│   │   ├── components/
│   │   │   ├── foundations/
│   │   │   ├── composite/
│   │   │   └── layout/
│   │   ├── pages/
│   │   ├── routes/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── styles/
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── backend/                      # Node.js + Express — see 02-system-architecture.md §3
│   ├── src/
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── services/
│   │   │   └── rag/
│   │   ├── models/                # Mongoose schemas — mirrors 03-database-schema.md
│   │   ├── middleware/
│   │   ├── providers/
│   │   └── config/
│   ├── server.js
│   └── package.json
│
├── docs/                          # this documentation set
│   ├── 00-README.md
│   ├── 01-brd-srs.md
│   ├── 02-system-architecture.md
│   ├── 03-database-schema.md
│   ├── 04-api-documentation.md
│   ├── 05-uiux-design-system.md
│   ├── 06-pages-and-user-flows.md
│   ├── 07-component-library.md
│   └── 08-roadmap-and-repo-structure.md
│
├── docker-compose.yml             # frontend + backend + local Atlas CLI deployment + Redis (ingestion queue)
├── .env.example
└── README.md
```

## 3. Environment variables (`.env.example`)

```bash
# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# MongoDB
MONGODB_URI=
MONGODB_DB_NAME=ekip

# App session
APP_JWT_SECRET=
REFRESH_COOKIE_NAME=ekip_rt
REFRESH_COOKIE_DOMAIN=

# LLM / embeddings (provider adapter — see 02-system-architecture.md §3.1)
LLM_PROVIDER=openai            # openai | anthropic | ollama
EMBEDDING_PROVIDER=openai      # openai | ollama
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
OLLAMA_BASE_URL=

# Ingestion queue (optional, Phase 2+)
REDIS_URL=

# Misc
NODE_ENV=development
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173
```

## 4. Suggested package choices (JS/Node stack)

| Concern | Package |
|---|---|
| Backend framework | `express` |
| MongoDB ODM | `mongoose` |
| Supabase client (server-side) | `@supabase/supabase-js` |
| JWT signing/verification (app session) | `jsonwebtoken` |
| Cookie parsing | `cookie-parser` |
| File upload (multipart) | `multer` |
| PDF text extraction | `pdf-parse` |
| DOCX text extraction | `mammoth` |
| PPTX text extraction | `pptx-parser` (or a maintained equivalent — verify current status before locking in) |
| CSV parsing | `papaparse` |
| OCR (scanned PDFs) | `tesseract.js` |
| Ingestion queue | `bullmq` + `redis` |
| Frontend data fetching | native `fetch` wrapped in a small `apiClient.js`, or `axios` with interceptors for token refresh |
| Frontend routing | `react-router-dom` |
| Charts (Analytics/Evaluation dashboards) | `recharts` |
| Icons | `lucide-react` |

## 5. Definition of done (per feature, all phases)

A feature is done when: it matches its FR in `01-brd-srs.md`; its API surface matches `04-api-documentation.md` (or that doc has been updated alongside it); its data shape matches `03-database-schema.md` (or that doc has been updated alongside it); its UI matches the design tokens in `05-uiux-design-system.md` and the page/flow spec in `06-pages-and-user-flows.md`; and — for anything touching documents or permissions — an audit log entry is verifiably written.
