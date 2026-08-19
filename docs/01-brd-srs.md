# EKIP — Business & Software Requirements Specification

## Part A — Business Requirements Document (BRD)

### 1. Problem statement

Large organizations store thousands of documents across disconnected systems: HR policies, employee manuals, technical documentation, legal contracts, product manuals, SOPs, compliance documents, and training material. Employees routinely spend hours locating a single answer.

**Example:**

> Employee asks: *"What is the reimbursement policy for international travel?"*

**Traditional path:** Open SharePoint → search files → open PDFs one by one → skim for the right section.

**EKIP path:** Employee asks the assistant → assistant retrieves the exact policy passage → answer returned with a citation (document, page/section) → employee can open the source in one click.

### 2. Business goals

- Cut average time-to-answer for policy/procedural questions from ~15–20 minutes to under 30 seconds.
- Reduce repeat tickets to HR/IT/Legal for questions already answered in existing documentation.
- Give managers visibility into what knowledge gaps exist across their teams (via analytics on unanswered/low-confidence queries).
- Establish an auditable, permission-aware system so sensitive documents are never exposed outside their intended audience — a hard requirement for enterprise procurement.

### 3. Target users

| Role | Can do | Cannot do |
|---|---|---|
| **Employee** | Ask questions, browse/search documents they're permitted to see, generate summaries, view their own conversation history | Upload documents, manage users, see other departments' restricted docs, view audit logs |
| **Manager** | Everything an Employee can do, plus department-level usage analytics, document adoption stats | Manage global users/roles, change document permissions, view org-wide audit log |
| **Administrator** | Upload/manage documents, manage users and roles, configure permissions, view full audit log, monitor ingestion & evaluation | — |

### 4. Success metrics (KPIs)

- **Answer accuracy** — sampled human review score on retrieved answers (target ≥ 90% "correct or partially correct").
- **Citation coverage** — % of answers that include at least one verifiable citation (target ≥ 98%; unsupported answers should be refused, not fabricated).
- **Retrieval precision@5** — relevant chunks in top 5 retrieved (tracked via the evaluation pipeline, see `02-system-architecture.md §7`).
- **Adoption** — weekly active users / total licensed seats.
- **Time-to-answer** — median seconds from question submitted to answer rendered.
- **Escalation rate** — % of conversations where the user hits 👎 or asks a human follow-up outside the tool.

### 5. Out of scope (v1)

- Real-time collaborative document editing.
- Automated policy authoring/generation (EKIP retrieves and summarizes existing docs; it does not draft new policy).
- Non-text document types beyond OCR'd scans (no video/audio transcription in Phase 1–2).

---

## Part B — Software Requirements Specification (SRS)

### 1. Functional requirements

#### FR-1 — Authentication & Authorization
- FR-1.1: Users authenticate via Supabase Auth (email + password in v1; SSO/SAML as a Phase 3 stretch goal).
- FR-1.2: On successful Supabase login, the backend issues its own session (access token in response body, refresh token as an HttpOnly cookie) — see `02-system-architecture.md §4`.
- FR-1.3: Every API request is authorized against a role (`employee`, `manager`, `admin`) and a department scope stored in MongoDB, not just "logged in."
- FR-1.4: Passwords, resets, and email verification are delegated entirely to Supabase Auth — EKIP never stores raw passwords.

#### FR-2 — Document management
- FR-2.1: Admins can upload PDF, DOCX, TXT, CSV, and PPTX files.
- FR-2.2: Each document is tagged with: department, owner, security level (`public`, `internal`, `confidential`, `restricted`), and allowed roles.
- FR-2.3: Upload triggers an async ingestion pipeline: extract → clean → chunk → embed → index (see architecture doc).
- FR-2.4: Admins can see per-document ingestion status (`queued`, `processing`, `ready`, `failed`) and re-trigger processing.
- FR-2.5: Scanned/image-only PDFs are routed through OCR before extraction.

#### FR-3 — RAG chat assistant
- FR-3.1: Users ask natural-language questions in a chat interface.
- FR-3.2: The system retrieves only chunks the requesting user is permitted to see (permission filter is applied inside the vector search query itself, not after the fact).
- FR-3.3: Every answer includes: the generated text, one or more citations (document name + page/section), and a confidence indicator.
- FR-3.4: If no sufficiently relevant chunk is found, the system must say so rather than answer from general knowledge — no silent fallback to un-grounded generation.
- FR-3.5: Conversations retain short-term memory within a session (e.g., "is it paid?" resolves against the prior turn's topic).

#### FR-4 — Citation engine
- FR-4.1: Citations must resolve to an actual stored chunk with document ID, page/section, and byte offset or paragraph index, so the source can be highlighted on open.
- FR-4.2: A confidence score is computed from retrieval similarity + (optionally) a secondary groundedness check.

#### FR-5 — Conversation history & memory
- FR-5.1: Users can view, rename, and delete their own past conversations.
- FR-5.2: Managers/Admins cannot read another user's conversation content, only aggregate, anonymized usage metrics (topic clusters, volume, feedback rate) — this is a deliberate privacy boundary, documented in FR-8.

#### FR-6 — Document summarizer
- FR-6.1: Given a document (or a selection within one), return a structured summary: purpose, key clauses/points, and a qualitative risk/attention flag where applicable.

#### FR-7 — Enterprise semantic search
- FR-7.1: A dedicated search page allows keyword-independent, meaning-based search across permitted documents, with department/tag/date filters.

#### FR-8 — Feedback & evaluation loop
- FR-8.1: Every answer has 👍/👎 feedback affordance.
- FR-8.2: Negative feedback is queued for the evaluation pipeline (hallucination review, retrieval-quality review).
- FR-8.3: Aggregate feedback metrics roll up to the Manager and Admin analytics views — individual conversation content does not.

#### FR-9 — Audit logging
- FR-9.1: Every document access, permission change, user role change, and login event is written to an append-only audit collection with actor, action, target, and timestamp.
- FR-9.2: Only Admins can query the audit log.

#### FR-10 — Multi-tenant readiness (Phase 3)
- FR-10.1: Every document, conversation, and user record carries a `tenantId`. All queries — including vector search — pre-filter on `tenantId` so no cross-tenant leakage is possible even under a shared cluster.

### 2. Non-functional requirements

| Category | Requirement |
|---|---|
| **Performance** | P95 answer latency ≤ 4s for a cached-embedding query against a corpus of ≤ 50k chunks |
| **Availability** | 99.5% uptime target for production; graceful degradation (search-only mode) if the LLM provider is unreachable |
| **Security** | JWT verified on every request; secrets never in frontend bundle; documents encrypted at rest (MongoDB Atlas encryption at rest) and in transit (TLS) |
| **Privacy** | Conversation content never used to answer another user's query; no cross-tenant data mixing |
| **Scalability** | Horizontally scalable API tier; MongoDB Atlas cluster tier scales independently of app servers |
| **Accessibility** | WCAG 2.1 AA across all authenticated pages (see `05-uiux-design-system.md §6`) |
| **Auditability** | Every restricted-document read is reconstructable from the audit log |
| **Observability** | Structured logs + request tracing on the API tier; ingestion pipeline emits status events consumable by the Admin console |

### 3. Assumptions & constraints

- The organization already has (or will provision) a Supabase project and a MongoDB Atlas cluster (M10+ recommended for Vector Search in production).
- LLM/embedding providers are external APIs by default; a local Ollama path is documented for air-gapped or cost-sensitive deployments but is not the default.
- v1 targets a single organization (single tenant); `tenantId` fields are present from day one to make Phase 3 multi-tenancy a data-migration, not a re-architecture.

### 4. Acceptance criteria (Phase 1 MVP)

- [ ] A user can sign up/log in via Supabase Auth and land on the dashboard.
- [ ] An Admin can upload a PDF and see it reach `ready` status.
- [ ] An Employee can ask a question about that PDF's content and receive an answer with a correct citation.
- [ ] A user without permission to a document cannot retrieve chunks from it, verified by an integration test that asserts zero leakage.
- [ ] All of the above is visible in the audit log for the Admin.
