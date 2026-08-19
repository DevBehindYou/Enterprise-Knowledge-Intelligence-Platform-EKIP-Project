# EKIP — System Architecture

## 1. High-level architecture

```
┌─────────────────────────────┐
│   React (Vite) + Tailwind   │  ← SPA, MVVM-organized (see §2)
│   Frontend (browser)        │
└───────────────┬──────────────┘
                │  HTTPS (JSON) + refresh cookie
                ▼
┌─────────────────────────────┐
│   Node.js + Express (BFF)   │  ← auth proxy, RBAC, RAG orchestration
│   API layer                 │
└───┬───────────────────┬──────┘
    │                   │
    ▼                   ▼
┌─────────┐     ┌───────────────────────┐
│ Supabase│     │  RAG Engine (module)  │
│  Auth   │     │  ingestion / retrieval│
│ (JWT)   │     │  / generation service │
└─────────┘     └────────┬──────────────┘
                          ▼
                ┌───────────────────────┐
                │   MongoDB Atlas       │
                │  - users / permissions│
                │  - documents / chunks │
                │  - $vectorSearch index│
                │  - conversations      │
                │  - audit_logs         │
                └────────┬──────────────┘
                          ▼
                ┌───────────────────────┐
                │  LLM / Embedding      │
                │  Provider Adapter     │
                │  (OpenAI / Anthropic /│
                │   Ollama-local)       │
                └───────────────────────┘
```

**Why this shape:** Supabase owns *identity* only (who you are). MongoDB owns *everything about what you can do and see* (role, department, permissions, documents, vectors, history, audit). The Express layer is the only thing that talks to both, so it's the single place JWT verification and permission filtering happen — the frontend never talks to MongoDB or the LLM provider directly.

---

## 2. Frontend architecture — MVVM in React

Plain React doesn't prescribe a layering, so EKIP adopts an explicit **MVVM (Model–View–ViewModel)** convention to keep business logic out of components:

| Layer | What lives here | Example |
|---|---|---|
| **Model** | Plain data shapes + the API client functions that fetch/mutate them. No React. | `src/models/document.js`, `src/services/documentService.js` (wraps `fetch` calls to `/api/documents`) |
| **ViewModel** | Custom hooks that hold state, call Model services, handle loading/error/derived state, and expose a clean interface to the View. No JSX. | `src/viewmodels/useChatViewModel.js`, `useDocumentLibraryViewModel.js` |
| **View** | Presentational components. Receive data + handlers as props (or call the ViewModel hook directly at the page level and pass props down). No `fetch`, no business logic. | `src/pages/ChatPage.jsx`, `src/components/ChatMessageBubble.jsx` |

**Rule of thumb:** if a component needs a `useEffect` that calls an API, that logic belongs in a ViewModel hook, not the component. Views should be testable by passing in props alone — no mocking `fetch` inside a component test.

**Example shape (illustrative, not implementation):**

```
useChatViewModel(conversationId)
  → { messages, isLoading, error, sendMessage(text), regenerate(messageId) }

ChatPage.jsx
  const vm = useChatViewModel(conversationId)
  return <ChatView {...vm} />
```

### 2.1 Frontend folder structure

```
frontend/
  src/
    models/            # data shapes + typedefs (JSDoc) — User, Document, Message, Citation
    services/           # api clients: authService, documentService, chatService, adminService
    viewmodels/         # useAuthViewModel, useChatViewModel, useDocumentLibraryViewModel, ...
    components/
      foundations/      # Button, Input, Badge, Modal, Toast, Table, Skeleton
      composite/         # CitationChip, ChatMessageBubble, SourceCard, DocumentCard, ConfidenceMeter
      layout/            # AppShell, TopBar, Sidebar, AdminShell
    pages/               # one folder per route, composed from components + a viewmodel
    routes/              # React Router route table + role-guarded route wrapper
    context/             # AuthContext (current user, role, department)
    hooks/               # generic hooks: useDebounce, usePagination, useToast
    lib/                 # supabaseClient.js, apiClient.js (axios/fetch wrapper with interceptors)
    styles/              # tailwind.config.js tokens, globals.css
  vite.config.js
  tailwind.config.js
```

### 2.2 Frontend routing & guards

- React Router v6+ with a `<RequireRole roles={['admin']}>` wrapper component.
- Route table lives in one file (`routes/index.jsx`) so the full page inventory in `06-pages-and-user-flows.md` maps 1:1 to route definitions.
- Unauthorized access to a role-gated route renders the `403 Forbidden` page (see page inventory), never a silent redirect with no explanation.

---

## 3. Backend architecture

Node.js + Express, layered the same way on the server side to avoid fat controllers:

```
backend/
  src/
    routes/            # thin: HTTP verb + path → controller
    controllers/       # parse request, call service, shape response
    services/
      authService.js         # verifies Supabase JWT, mints app session
      documentService.js      # CRUD + triggers ingestion
      permissionService.js    # resolves what a user can see
      auditService.js         # append-only log writer
      rag/
        ingestionService.js   # extract → chunk → embed → store
        retrievalService.js   # embed query → $vectorSearch w/ permission filter
        generationService.js  # prompt assembly → LLM call → citation mapping
        evaluationService.js  # feedback aggregation, retrieval-quality sampling
    models/            # Mongoose schemas (see 03-database-schema.md)
    middleware/         # requireAuth, requireRole, auditWrite, errorHandler
    providers/          # llmProvider.js, embeddingProvider.js (adapter pattern — swap OpenAI/Anthropic/Ollama)
    config/             # env loading, constants
  server.js
```

### 3.1 Provider adapter pattern

Both the LLM and the embedding model sit behind a single interface so the org can swap providers without touching the RAG services:

```
embeddingProvider.embed(text) -> number[]
llmProvider.generate({ systemPrompt, context, question }) -> { text, usage }
```

Default: OpenAI for both. Alternate configs: Anthropic Claude for generation + OpenAI for embeddings; fully local via Ollama (Llama 3.1 8B) for air-gapped deployments. Selection is a single environment variable (`LLM_PROVIDER`, `EMBEDDING_PROVIDER`).

---

## 4. Authentication flow (Supabase + JWT + cookies)

A pure client-side Supabase session (token in `localStorage`) is not used here — it's vulnerable to XSS token theft and doesn't give the Express layer a clean way to enforce MongoDB-side permissions on every request. Instead:

1. **Login:** Frontend calls `POST /api/auth/login` (Express) with email/password.
2. Express calls Supabase Auth (`signInWithPassword`) server-side.
3. On success, Express:
   - looks up (or creates on first login) the mirrored user record in MongoDB, keyed by `supabaseUserId`;
   - mints its **own** short-lived access JWT containing `{ userId, role, department, tenantId }` (this is the token EKIP's own middleware checks — it never re-validates against Supabase on every request);
   - sets a **refresh token as an HttpOnly, Secure, SameSite=Lax cookie**, scoped to `/api/auth/refresh`;
   - returns the short-lived access token in the JSON response body only (kept in memory / React context, never in `localStorage`).
4. **Every subsequent API call** sends the access token as a Bearer header. `requireAuth` middleware verifies it and attaches `req.user`.
5. **On access-token expiry**, the frontend's API client transparently calls `POST /api/auth/refresh` (cookie sent automatically by the browser); Express validates the refresh cookie, re-mints an access token.
6. **Logout** clears the refresh cookie server-side and revokes the Supabase session.

This mirrors the pattern most current guidance converges on: *"the access token lives in a JS variable — recoverable via silent refresh; the refresh token sits in an HttpOnly, Secure cookie scoped to the refresh endpoint."* It keeps XSS from being able to read either token directly out of storage, and CSRF is mitigated via `SameSite=Lax` plus a double-submit CSRF token on state-changing admin routes.

### 4.1 Role-based access control (RBAC)

- Roles: `employee`, `manager`, `admin` — stored on the MongoDB `users` collection, **not** in Supabase metadata, so role changes take effect without a re-login (checked fresh from Mongo on each `requireAuth` pass, cached briefly per request).
- Department scoping and document `securityLevel` (`public` / `internal` / `confidential` / `restricted`) combine with role to resolve visibility — see `permissionService.resolveVisibleDepartments(user)`.

---

## 5. RAG pipeline

### 5.1 Ingestion (on document upload)

```
Upload (PDF/DOCX/TXT/CSV/PPTX)
   ↓
Virus/type validation
   ↓
Text extraction  ── scanned/image PDF? → OCR (Tesseract.js or cloud OCR) → text
   ↓
Cleaning (strip boilerplate, normalize whitespace)
   ↓
Chunking (recursive, ~500–800 tokens, ~15% overlap, section-aware where possible)
   ↓
Embedding (embeddingProvider.embed per chunk)
   ↓
Store chunk documents in MongoDB with: text, embedding vector, documentId,
page/section, department, securityLevel, tenantId
   ↓
Mark parent document status: ready
```

Ingestion runs as an async job (queue table in MongoDB or a lightweight job runner such as BullMQ backed by Redis in production) so uploads don't block the request thread. The Admin console polls/subscribes to status.

### 5.2 Retrieval

```
User question
   ↓
Embed query
   ↓
MongoDB $vectorSearch
   pre-filter: tenantId == user.tenantId
             AND securityLevel in resolveAllowedLevels(user)
             AND department in resolveVisibleDepartments(user)
   ↓
Top-K chunks (K≈6–10) + similarity scores
```

The permission filter is a **pre-filter inside the `$vectorSearch` stage itself**, not a post-hoc check on results — this is what makes permission-aware retrieval actually safe rather than merely "usually fine."

### 5.3 Generation

```
Top-K chunks + conversation short-term memory (last N turns)
   ↓
Prompt assembly (system prompt instructs: answer only from provided context;
if context is insufficient, say so explicitly; every claim must map to a chunk)
   ↓
llmProvider.generate(...)
   ↓
Parse answer → map cited chunks back to {documentName, page/section}
   ↓
Compute confidence (retrieval similarity, optionally blended with an
LLM self-assessment of groundedness)
   ↓
Persist to conversation history + write audit log entries for each
document actually surfaced
```

### 5.4 Example rendered answer (contract, not literal UI copy)

```
Answer: Employees receive health insurance coverage up to ₹5 lakh annually.
Sources:
  1. Employee_Benefits.pdf — Page 12
Confidence: High (0.91)
```

---

## 6. Multi-tenancy & data isolation

Recommended pattern for this scale: **single collection + `tenantId` field + pre-filter**, rather than a database-per-tenant. It shares the vector index (cost-efficient), keeps schema management simple, and scales without per-tenant infrastructure sprawl. Every service-layer query — especially `$vectorSearch` — includes `tenantId` in its filter, and this is enforced centrally in `permissionService`, not re-implemented per route.

## 7. Evaluation pipeline

- **Retrieval quality**: periodic sampled runs of a labeled question set against the live index, scoring precision@5 / recall@5.
- **Hallucination rate**: sampled human review of answers flagged 👎 or below a confidence threshold.
- **Feedback loop**: 👍/👎 stored per message; aggregated (never raw content) into Manager/Admin analytics.

## 8. Deployment

### Development
Docker Compose running: frontend (Vite dev server), backend (Express + nodemon), and — since MongoDB Atlas Vector Search requires Atlas (or the Atlas local CLI deployment) — a local **Atlas CLI deployment** container standing in for the cloud cluster, plus Redis if using BullMQ for the ingestion queue.

### Production
```
Load Balancer
     │
Container orchestration (ECS/Kubernetes/App Service — cloud-agnostic)
     │
 ┌───┴────┐
 Frontend  Backend (auto-scaled, stateless)
  (static,        │
   CDN)      MongoDB Atlas (managed, Vector Search enabled)
                  │
             Supabase (managed Auth)
                  │
           LLM/Embedding provider (external API or GPU node pool for Ollama)
```

Frontend builds to static assets (Vite `build`) served via CDN; backend is stateless (session state lives in the refresh cookie + Mongo), so it scales horizontally behind the load balancer without sticky sessions.

## 9. Migration path off MongoDB Atlas Vector Search (if needed)

If corpus size or query patterns eventually demand a dedicated vector engine (e.g., very high QPS hybrid search, > few million vectors with tight p99 latency), the `retrievalService` module is the only place that needs to change — it already sits behind an interface (`retrieve(query, filters) -> chunks[]`), so swapping the implementation to call Qdrant or another engine is additive, not a rewrite of the ingestion or generation layers.
