# EKIP — API Documentation

Base URL: `/api`. All authenticated endpoints require an `Authorization: Bearer <accessToken>` header unless noted. Responses are JSON. Errors follow:

```json
{ "error": { "code": "STRING_CODE", "message": "Human-readable message" } }
```

---

## Auth

### `POST /api/auth/signup`
Creates a Supabase identity + mirrored MongoDB user (`status: "invited"` unless self-signup is enabled for the org's email domain).
```json
// Request
{ "name": "Priya Shah", "email": "priya@company.com", "password": "••••••••" }
// Response 201
{ "userId": "...", "email": "priya@company.com", "status": "invited" }
```

### `POST /api/auth/login`
```json
// Request
{ "email": "priya@company.com", "password": "••••••••" }
// Response 200 (also sets HttpOnly refresh cookie)
{ "accessToken": "...", "user": { "id": "...", "name": "Priya Shah", "role": "employee", "department": "HR" } }
```

### `POST /api/auth/refresh`
No body — refresh cookie is read server-side. Returns a new `accessToken`.

### `POST /api/auth/logout`
Clears the refresh cookie and revokes the Supabase session.

### `POST /api/auth/forgot-password` / `POST /api/auth/reset-password`
Proxies to Supabase Auth's password-recovery flow.

### `GET /api/auth/me`
Returns the caller's profile, including `notificationPreferences`.

### `PATCH /api/auth/me`
Self-service profile update. Deliberately narrow — only these two fields are writable. `role`, `department`, `email`, and `status` are privileged and are silently ignored here, so this endpoint is not a self-escalation path; they remain admin-only via `PATCH /api/users/:id`.
```json
// Request (either field may be omitted)
{ "name": "Priya Shah", "notificationPreferences": { "documentUpdates": true, "weeklyDigest": false } }
// Response 200
{ "user": { "id": "...", "name": "Priya Shah", "role": "employee", "notificationPreferences": { "...": "..." } } }
```

### `POST /api/auth/change-password`
Re-verifies `currentPassword` against Supabase before writing the new one — without that step a stolen access token could be used to lock the real owner out. Rate-limited like the other credential endpoints. The new password must satisfy the same server-side policy as signup.
```json
{ "currentPassword": "••••••••", "newPassword": "••••••••" }
```

### `POST /api/auth/logout-all`
Revokes every session for the caller, **including the current one**. Sessions are stateless JWTs, so this works by stamping `sessionsValidFrom` on the user record; `requireAuth` and the refresh exchange both reject any token whose `iat` predates it. Subsequent requests with the old token return `AUTH_SESSION_REVOKED`.

---

## Chat / RAG

### `POST /api/chat/ask`
```json
// Request
{ "conversationId": "optional-existing-id", "question": "What is the reimbursement policy for international travel?" }
// Response 200
{
  "conversationId": "...",
  "messageId": "...",
  "answer": "Employees are reimbursed for international travel up to ₹80,000 per trip, subject to pre-approval.",
  "citations": [
    { "documentId": "...", "documentName": "Travel_Policy.pdf", "page": 4, "chunkId": "..." }
  ],
  "confidence": 0.93
}
```
If no permitted, relevant chunk clears the retrieval threshold, `answer` explains that no grounded answer was found rather than guessing, and `citations` is `[]`.

### `POST /api/chat/messages/:messageId/feedback`
```json
{ "rating": "up" }  // or "down"
```

### `GET /api/chat/conversations` — list current user's conversations (paginated).
### `GET /api/chat/conversations/:id` — full message history for one conversation.
### `PATCH /api/chat/conversations/:id` — rename / archive.
### `DELETE /api/chat/conversations/:id`

---

## Documents

### `GET /api/documents` — list, filterable by `department`, `securityLevel`, `status`, `tag`, permission-filtered to the caller automatically.
### `GET /api/documents/search?q=...` — semantic search (embeds `q`, runs `$vectorSearch`, groups results by parent document).
### `GET /api/documents/:id` — metadata + signed URL to preview (only if caller is permitted).
### `GET /api/documents/:id/file` — streams the original file. Requires the "cite" access level (not just "view"); re-checks permission on every request; returns `DOCUMENT_NOT_FOUND` (not a 403) for both nonexistent and unauthorized documents, matching the rest of the API's "don't leak existence" pattern.
### `POST /api/documents` — **Admin only.** Multipart upload.
```json
// Request (multipart/form-data): file, department, securityLevel, allowedRoles[], tags[]
// Response 202
{ "documentId": "...", "status": "queued" }
```
### `GET /api/documents/:id/status` — ingestion status (`queued`/`processing`/`ready`/`failed`).
### `POST /api/documents/:id/reprocess` — **Admin only.**
### `DELETE /api/documents/:id` — **Admin only.**
### `POST /api/documents/:id/summarize`
```json
// Response 200
{ "purpose": "Vendor Agreement", "keyPoints": ["Payment terms: net-30", "Termination: 60-day notice"], "riskFlag": "medium" }
```

---

## Permissions

### `GET /api/documents/:id/permissions` — **Admin only.** Lists role/user grants.
### `POST /api/documents/:id/permissions` — **Admin only.**
```json
{ "grantType": "user", "userId": "...", "accessLevel": "view" }
```
### `DELETE /api/documents/:id/permissions/:permissionId` — **Admin only.**

---

## Users (Admin console)

### `GET /api/users` — **Admin only.** Paginated, filterable by department/role/status.
### `POST /api/users/invite` — **Admin only.**
### `PATCH /api/users/:id` — **Admin only.** Update role, department, status.
### `DELETE /api/users/:id` — **Admin only.** Soft-delete (`status: "suspended"`).

---

## Analytics

### `GET /api/analytics/department` — **Manager, Admin.** Query volume, top topics, feedback rate, scoped to the caller's department for Managers, org-wide for Admins.
### `GET /api/analytics/evaluation` — **Admin only.** Retrieval precision samples, hallucination review queue size, confidence distribution.

---

## Audit

### `GET /api/audit` — **Admin only.** Filterable by `actorId`, `targetType`, `action`, date range. Paginated.

---

## Settings — Storage Integration (Admin only)

Connects an object-storage bucket for the File Manager. Every supported provider speaks the S3 API, so one client covers all of them; the catalog endpoint describes which credentials each one needs and the backend derives the endpoint from them.

Credentials are encrypted with AES-256-GCM before being written to MongoDB (`backend/src/utils/secretVault.js`, key derived from `APP_JWT_SECRET`) and are **never** returned in full — reads get a `••••abcd` mask. Posting a mask back unchanged means "keep the stored value", so editing a bucket name doesn't wipe the keys.

> **Note:** rotating `APP_JWT_SECRET` makes previously stored integration credentials undecryptable. They read as unset and must be re-entered in Settings. This is the documented trade-off for not requiring a second secret to be provisioned.

### `GET /api/settings/storage/providers`
Provider catalog driving the dynamic form. Supported: `amazon-s3`, `supabase`, `google-cloud-storage` (HMAC interoperability), `cloudflare-r2`, `digitalocean-spaces`, `backblaze-b2`, `wasabi`, `minio`, `s3-compatible`. Each entry carries `fields[]` (`key`, `label`, `placeholder`, `required`, `secret`, `help`), a `help` string, and a `docsUrl`.

### `GET /api/settings/storage` — saved connections, secrets masked.
### `POST /api/settings/storage`
Body is `{ provider, name, publicBaseUrl?, setActive?, ...providerFields }`. The credentials are verified with a `HeadBucket` round-trip on save; the response includes `test: { ok, message }`. **A connection that fails verification is never made active** — activating a broken provider would break the File Manager for everyone.
### `POST /api/settings/storage/test` — verify unsaved form values before saving.
### `POST /api/settings/storage/:id/test` — re-verify a saved connection.
### `POST /api/settings/storage/:id/activate` — make it the one active provider (re-tests first; refuses on failure).
### `PATCH /api/settings/storage/:id` — update; re-verifies, and deactivates the connection if it has stopped working.
### `DELETE /api/settings/storage/:id` — removes the saved credentials only. **Nothing in the bucket is deleted.**

---

## Settings — AI Integration (Admin only)

### `GET /api/settings/ai/providers`
Catalog: `ollama-cloud` (platform default, `gpt-oss:120b`, free tier), `openai`, `anthropic`, `gemini`, `ollama-local`, `custom` (any OpenAI-compatible endpoint — Groq, Together, OpenRouter, vLLM, …). Cloud Ollama model names drop the `-cloud` suffix when called over the API.

### `GET /api/settings/ai`
Configured providers. On a tenant's first read this **seeds an Ollama Cloud / `gpt-oss:120b` entry as the default**, left `unverified` with no key rather than with a placeholder, so the UI shows an honest "needs setup" state.

### `POST /api/settings/ai` — add a provider (`{ provider, label, model, baseUrl?, apiKey?, temperature?, maxTokens?, setDefault? }`). Verified on save with a one-word completion; a provider that fails does not become the default.
### `POST /api/settings/ai/test` and `POST /api/settings/ai/:id/test` — verify unsaved values, or a saved config.
### `POST /api/settings/ai/:id/default` — make it the default (re-tests; refuses on failure).
### `PATCH /api/settings/ai/:id` — update. An omitted or masked `apiKey` keeps the stored key.
### `DELETE /api/settings/ai/:id` — remove. Refuses to delete the last remaining provider, and promotes another to default if the deleted one held it.

**Resolution order at generation time** (`backend/src/providers/llmProvider.js`): the tenant's default DB provider → the env adapter (`LLM_PROVIDER`). The env path stays as the fallback so RAG works on a fresh install before anyone opens Settings, and a misconfigured tenant provider degrades to it rather than failing the user's question.

---

## File Manager

Backed by the active storage connection. Reads are open to any authenticated user; **every mutation is admin-only.** All keys are namespaced under `tenants/<tenantId>/`, and that prefix is always taken from the authenticated session, never from the request — so no crafted path can address another tenant's objects. Paths are additionally rejected for traversal (`..`), absolute form, backslashes, and control characters, and that validation runs *before* the storage lookup.

S3 has no real directories: a folder is a key prefix ending in `/`, and an empty folder is a zero-byte marker object (filtered out of listings). Rename and move are therefore copy-then-delete, which for a folder means once per object underneath — the responses return counts rather than implying atomicity.

### `GET /api/files/status`
Whether storage is connected, so the UI can render setup guidance instead of an error. The one endpoint in this group readable by non-admins without exposing credentials. Returns `{ configured, provider?, bucket?, canConfigure }`.
### `GET /api/files?path=&search=&sortBy=&sortDir=` — one folder's immediate contents as `{ path, folders[], files[] }`. Returns `409 STORAGE_NOT_CONFIGURED` when nothing is connected.
### `GET /api/files/tree` — folder tree for the sidebar (depth-capped).
### `GET /api/files/search?q=&kind=&limit=` — recursive search across the tenant prefix.
### `GET /api/files/usage` — total bytes, object count, and a breakdown by kind.
### `GET /api/files/stat?path=` — one object's metadata.
### `GET /api/files/signed-url?path=&download=&expiresIn=` — presigned GET for preview or download; bytes go browser → provider. `download=true` writes a `file.download` audit entry.
### `GET /api/files/raw?path=` — streams an object through the API, for inline text/code preview.
### `POST /api/files/upload` — **Admin only.** Multipart, field `files` (up to 25, 100MB each), plus `path`. Buffered in memory and forwarded straight to the provider. Partial success is reported as `{ uploaded[], failed[] }` — one bad file in a drop doesn't discard the rest.
### `POST /api/files/sign-upload` — **Admin only.** Presigned PUT so large files skip the API tier.
### `POST /api/files/folder` — **Admin only.** `{ path, name }`.
### `PATCH /api/files/rename` — **Admin only.** `{ path, name, isFolder }`.
### `POST /api/files/move` — **Admin only.** `{ items[], destination, mode: "move"|"copy" }`. Refuses to move a folder inside itself.
### `POST /api/files/delete` — **Admin only.** `{ paths[], folderPaths[] }`. Deleting a folder deletes everything beneath it; returns the object count actually removed. All paths are validated before anything is deleted, so a bad entry can't cause a partial delete.

---

## System / health

### `GET /api/health` — liveness/readiness for the API tier (no auth).
### `GET /api/ingestion/queue` — **Admin only.** Current queue depth and per-job stage, for the ingestion monitor page.

---

## Common error codes

| Code | Meaning |
|---|---|
| `AUTH_INVALID_CREDENTIALS` | Login failed |
| `AUTH_TOKEN_EXPIRED` | Access token expired — client should call `/api/auth/refresh` |
| `AUTH_FORBIDDEN` | Authenticated but role/permission does not allow this action |
| `DOCUMENT_NOT_FOUND` | Document does not exist or caller has no visibility into it (identical response for both, to avoid leaking existence of restricted docs) |
| `INGESTION_FAILED` | Document processing failed — see `processingError` on the document record |
| `RATE_LIMITED` | Too many requests in the current window |
| `VALIDATION_ERROR` | Malformed request body, or a rejected file path (traversal, control characters, over-long) |
| `AUTH_SESSION_REVOKED` | Token predates a "log out everywhere" — client must log in again |
| `STORAGE_NOT_CONFIGURED` | No storage provider is connected (409) — the File Manager renders setup guidance for this, not an error |
| `STORAGE_TEST_FAILED` | Tried to activate a storage connection that isn't reachable |
| `STORAGE_REQUEST_FAILED` | The storage provider rejected or failed the request (502) |
| `FILE_NOT_FOUND` | The object no longer exists in the bucket |
| `AI_TEST_FAILED` | Tried to make an unreachable AI provider the default |
| `AI_PROVIDER_ERROR` | The AI provider rejected the request (bad key, unknown model, quota) |
| `AI_PROVIDER_TIMEOUT` | The AI provider did not respond in time (504) |
