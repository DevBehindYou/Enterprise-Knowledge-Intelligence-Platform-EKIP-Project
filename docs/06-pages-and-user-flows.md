# EKIP — Pages & User Flows
### For the design team

Every page below maps to a route in `routes/index.jsx` (see `02-system-architecture.md §2.2`) and should get one Figma frame (desktop, ≥1280px) plus one mobile/tablet variant where the page is realistically used off-desktop (chat, document preview, notifications).

Legend: 🟢 Employee · 🔵 Manager · 🟣 Admin · ⚪ Public (unauthenticated)

---

## 1. Public pages

### 1.1 Login — ⚪
`/login`
```
┌───────────────────────────────────────────┐
│  (dark canvas)                              │
│        ┌───────────────────────┐           │
│        │  (light card, centered)│           │
│        │  EKIP  wordmark          │           │
│        │  ─────────────────────  │           │
│        │  Email  [_____________] │           │
│        │  Password [___________] │           │
│        │  [ Log in ]  (accent)    │           │
│        │  Forgot password?        │           │
│        └───────────────────────┘           │
└───────────────────────────────────────────┘
```
Notes: single centered light card on the dark canvas — directly reusing the reference image's frame-within-a-frame composition. No marketing copy; this is an internal tool. SSO button placeholder present but disabled/hidden until Phase 3.

### 1.2 Sign up (invited or domain-restricted self-signup) — ⚪
`/signup` — same shell as Login. If self-signup is disabled org-wide, this route redirects to a "contact your admin" state instead of a form.

### 1.3 Forgot / Reset password — ⚪
`/forgot-password`, `/reset-password` — same shell, single-field forms, success state confirms email sent without revealing whether the address exists (standard practice).

### 1.4 403 Forbidden / 404 Not Found / 500 Error — ⚪/🟢/🔵/🟣
Shared error-page template inside the authenticated shell when possible (so nav doesn't disappear), full dark/light shell when not authenticated. Copy is specific: 403 says *"You don't have access to this page — ask your admin if you think this is wrong,"* not a bare "Forbidden."

---

## 2. Authenticated shell (applies to all pages below)

```
┌──────────────────────────────────────────────────────────┐
│ (dark top bar) EKIP     [search]        [🔔] [avatar ▾]   │
├───────┬────────────────────────────────────────────────────┤
│ (dark │  (light canvas — page content renders here)        │
│ side- │                                                     │
│ bar)  │                                                     │
│ Home  │                                                     │
│ Ask   │                                                     │
│ Docs  │                                                     │
│ ...   │                                                     │
└───────┴────────────────────────────────────────────────────┘
```
Sidebar items are role-conditional — Manager sees "Analytics" added below "Docs"; Admin sees a whole second grouped section ("Admin console") with a visual divider.

---

## 3. Core pages (all authenticated roles)

### 3.1 Dashboard / Home — 🟢🔵🟣
`/`
- Greeting + a prompt box ("Ask anything about company policy…") that drops straight into Chat.
- "Recent conversations" (3–5 cards).
- "Suggested questions" (derived from popular/trending queries in the org, permission-filtered).
- For Manager/Admin: a compact stat strip above the fold (query volume this week, feedback rate) — full detail lives on Analytics.

### 3.2 Chat / Ask Assistant — 🟢🔵🟣
`/chat` and `/chat/:conversationId`
```
┌───────────────────────────────┬───────────┐
│  Conversation list (collapsible) │           │
├───────────────────────────────┤  (light    │
│  Message thread                  │   canvas) │
│   [assistant bubble]              │           │
│     answer text…                  │           │
│     [Citation Chip] [Citation Chip]│           │
│     Confidence: ▓▓▓▓▓░ High       │           │
│     👍 👎                          │           │
│  [user bubble]                    │           │
│  ...                              │           │
├───────────────────────────────┤           │
│  [ Ask a question...        ] [Send]│           │
└───────────────────────────────┴───────────┘
```
- Answers stream token-by-token (the one place the design system permits motion beyond fades).
- Citation Chips per §5 of the design system doc; clicking one opens the Document Preview page in a side panel (desktop) or a full-screen sheet (mobile), scrolled to the cited page.
- If ungrounded, the assistant bubble uses a distinct muted style (no confidence meter, no citation chips) and states plainly that no answer was found.

### 3.3 Conversation history — 🟢🔵🟣
`/chat/history` — table/list of past conversations, rename inline, archive/delete, search by title.

### 3.4 Document Library / Enterprise Search — 🟢🔵🟣
`/documents`
```
┌───────────────────────────────────────────┐
│  [ Semantic search box                   ] │
│  Filters: Department ▾  Type ▾  Tag ▾       │
├───────────────────────────────────────────┤
│  [Doc card] [Doc card] [Doc card] [Doc card] │
│  [Doc card] [Doc card] ...                    │
└───────────────────────────────────────────┘
```
- Search is semantic by default (per FR-7); a toggle allows exact-keyword filename search.
- Doc cards show: filename, department badge, security-level badge, last-updated. Only documents the caller is permitted to see ever render — never a greyed-out "locked" card implying something exists that they can't confirm exists (avoids leaking existence of restricted content, consistent with the API's `DOCUMENT_NOT_FOUND` behavior).

### 3.5 Document Preview / Detail — 🟢🔵🟣
`/documents/:id`
- Rendered document (PDF viewer / DOCX-to-HTML render) with the cited chunk highlighted when arrived at via a Citation Chip.
- Right rail: metadata (department, owner, security level, version, tags) and an "Ask about this document" shortcut that pre-scopes a new chat to this doc.

### 3.6 Document Summarizer — 🟢🔵🟣
`/documents/:id/summarize`
- Structured output: Purpose / Key Points (bulleted) / Risk flag (badge: low/medium/high) — never a wall of prose; this page's whole reason to exist is compression.

### 3.7 Notifications — 🟢🔵🟣
`/notifications` — ingestion completions relevant to the user (if they requested a summary/reprocess), feedback acknowledgments, admin announcements.

### 3.8 Profile & Settings — 🟢🔵🟣
`/settings` — name, avatar, password change (proxied to Supabase), notification preferences, session/device list with a "log out everywhere" action.

---

## 4. Manager-only pages

### 4.1 Department Analytics — 🔵🟣
`/analytics`
- Query volume over time (line chart), top question topics (bar/list), feedback rate (👍 vs 👎 ratio), least-answered topics (surfaces knowledge gaps — the single most valuable Manager view).
- Explicitly **no** individual conversation content ever appears here — the page's empty/loading states should reinforce this ("Showing aggregate trends only — individual conversations stay private") so the privacy boundary is visible, not just enforced invisibly.

---

## 5. Admin-only pages

### 5.1 Admin Console shell
`/admin` — a nested shell inside the main app shell; sidebar swaps to admin-specific nav (Users, Documents, Permissions, Audit Log, Evaluation, System Health).

### 5.2 User Management — 🟣
`/admin/users`
- Table: name, email, role, department, status, last login. Row actions: edit role/department, suspend, resend invite.
- Invite flow: modal with email + role + department → triggers `POST /api/users/invite`.

### 5.3 Document Management — 🟣
`/admin/documents`
- Superset of the Document Library with upload, reprocess, delete, and ingestion status per row (queued/processing/ready/failed with the design system's status colors + icon + label).
- Upload flow: drag-and-drop zone → metadata form (department, security level, allowed roles, tags) → progress → status.

### 5.4 Permissions Matrix — 🟣
`/admin/permissions`
- A grid: rows = documents (or document groups by department), columns = roles, cells = access level (none/view/cite), with an "add user-specific override" affordance per row. This is the page most worth a dedicated, careful design pass — it's the control surface for the product's core trust promise.

### 5.5 Audit Log Viewer — 🟣
`/admin/audit`
- Filterable table (actor, action, target, date range), mono type for timestamps/IDs per the design system, export-to-CSV action.

### 5.6 Evaluation Dashboard — 🟣
`/admin/evaluation`
- Retrieval precision trend, hallucination review queue (flagged 👎 answers awaiting triage, with a "mark reviewed" action + notes field), confidence-score distribution histogram.

### 5.7 System Health / Ingestion Queue — 🟣
`/admin/system`
- Queue depth, per-job stage, failed-job retry action, LLM/embedding provider status indicator (so an Admin immediately sees if the configured provider is unreachable, matching the graceful-degradation NFR).

### 5.8 Organization Settings (Phase 3 stretch) — 🟣
`/admin/organization` — tenant-level settings once multi-tenancy ships: branding, SSO config, data retention policy.

---

## 6. Per-role user flows

### 6.1 Employee — "Find a policy answer"
Login → Dashboard prompt box → types question → Chat streams answer with citation → clicks Citation Chip → Document Preview opens scrolled to source → (optional) 👍/👎 on the answer.

### 6.2 Manager — "Spot a knowledge gap"
Login → Dashboard stat strip → Analytics → sorts by lowest feedback rate → identifies a policy area with repeated 👎 → flags it to the relevant Admin/document owner (outside-system action, e.g. email — no in-app "flag to admin" in v1, noted as a Phase 2 candidate).

### 6.3 Admin — "Onboard a new policy document"
Admin Console → Document Management → Upload → fill department/security level/tags → watch status move queued → processing → ready → spot-check by asking a question in Chat → confirm citation resolves correctly → (if a sensitive doc) visit Permissions Matrix to fine-tune beyond the department default.

### 6.4 Admin — "Investigate a hallucination report"
Evaluation Dashboard → Hallucination review queue → open flagged answer → view the retrieved chunks that led to it (read-only, not the full private conversation) → mark reviewed with notes → if a retrieval-quality issue, cross-check the source document's chunking in Document Management.

---

## 7. Empty, loading, and error states (apply across all pages above)

- **Empty:** invitation-toned per the design system's voice rules — never "No data."
- **Loading:** skeleton blocks matching the final layout's shape (not spinners) for anything above ~300ms; token-stream shimmer specifically for the assistant's answer while it's generating.
- **Error:** specific and actionable, in the interface's voice, with a retry affordance where retrying is meaningful (e.g., reprocessing a failed document) and a clear "contact your admin" path where it isn't (e.g., a permission error).
