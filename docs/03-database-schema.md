# EKIP — Database Schema (MongoDB Atlas)

All collections carry `tenantId` from day one (single-tenant in v1, always populated with a default tenant id) so Phase 3 multi-tenancy is a filter, not a migration. Timestamps (`createdAt`, `updatedAt`) are implied on every collection via Mongoose timestamps and omitted below for brevity except where they carry special meaning.

## 1. `users`

Mirrors Supabase-authenticated identities with the app-specific role/department data Supabase doesn't need to know about.

```js
{
  _id: ObjectId,
  tenantId: ObjectId,
  supabaseUserId: String,      // FK to Supabase auth.users.id — indexed, unique
  name: String,
  email: String,               // indexed, unique (mirrors Supabase, kept for fast lookups/joins in logs)
  role: String,                // enum: "employee" | "manager" | "admin"
  department: String,          // e.g. "HR", "Engineering", "Legal"
  status: String,              // enum: "active" | "invited" | "suspended"
  lastLoginAt: Date,
  createdAt: Date,
  updatedAt: Date
}
```
**Indexes:** `{ supabaseUserId: 1 }` unique, `{ email: 1 }` unique, `{ tenantId: 1, department: 1 }`.

## 2. `documents`

Parent record for every uploaded file. Chunk-level data lives separately (see `document_chunks`) so this collection stays small and fast to list/filter.

```js
{
  _id: ObjectId,
  tenantId: ObjectId,
  filename: String,
  originalName: String,
  fileType: String,           // "pdf" | "docx" | "txt" | "csv" | "pptx"
  ownerId: ObjectId,          // ref: users._id (uploader)
  department: String,
  securityLevel: String,      // enum: "public" | "internal" | "confidential" | "restricted"
  allowedRoles: [String],     // e.g. ["manager", "admin"] — additive on top of department scoping
  status: String,             // enum: "queued" | "processing" | "ready" | "failed"
  processingError: String,    // populated only if status === "failed"
  pageCount: Number,
  sizeBytes: Number,
  storageUrl: String,         // object storage location of the original file
  tags: [String],
  version: Number,            // incremented on re-upload/reprocess
  createdAt: Date,
  updatedAt: Date
}
```
**Indexes:** `{ tenantId: 1, department: 1, securityLevel: 1 }`, `{ tenantId: 1, status: 1 }`, text index on `{ originalName: "text", tags: "text" }` for the document library's non-semantic filter/search.

## 3. `document_chunks`

The retrieval unit. One document produces many chunks. This is the collection with the Atlas Vector Search index on `embedding`.

```js
{
  _id: ObjectId,
  tenantId: ObjectId,
  documentId: ObjectId,       // ref: documents._id
  department: String,          // denormalized from parent document for fast pre-filtering
  securityLevel: String,       // denormalized from parent document
  text: String,                 // the chunk content
  embedding: [Number],          // vector, dimension matches embeddingProvider (e.g. 1536)
  page: Number,
  section: String,              // heading/section label if extractable
  chunkIndex: Number,           // ordinal position within the document
  createdAt: Date
}
```
**Vector index (`$vectorSearch`):**
```js
{
  name: "chunk_vector_index",
  type: "vectorSearch",
  fields: [
    { type: "vector", path: "embedding", numDimensions: 1536, similarity: "cosine" },
    { type: "filter", path: "tenantId" },
    { type: "filter", path: "department" },
    { type: "filter", path: "securityLevel" }
  ]
}
```
This lets every retrieval query pre-filter on tenant/department/security level **inside** the vector search stage itself — the core mechanism behind permission-aware retrieval.

## 4. `document_permissions`

Explicit overrides beyond the department/role default (e.g., a named user in another department granted one-off access to a specific document).

```js
{
  _id: ObjectId,
  tenantId: ObjectId,
  documentId: ObjectId,        // ref: documents._id
  grantType: String,            // "role" | "user"
  role: String,                  // if grantType === "role"
  userId: ObjectId,             // if grantType === "user"
  accessLevel: String,           // "view" | "cite" (view = can read in chat/search; cite = can also open original file)
  grantedBy: ObjectId,           // ref: users._id
  createdAt: Date
}
```
**Indexes:** `{ tenantId: 1, documentId: 1 }`.

## 5. `conversations`

```js
{
  _id: ObjectId,
  tenantId: ObjectId,
  userId: ObjectId,             // ref: users._id — owner; not readable by managers/admins (privacy boundary, FR-5.2)
  title: String,                 // auto-generated from first question, user-renamable
  messages: [
    {
      _id: ObjectId,
      role: String,               // "user" | "assistant"
      text: String,
      citations: [
        {
          documentId: ObjectId,
          documentName: String,
          page: Number,
          section: String,
          chunkId: ObjectId
        }
      ],
      confidence: Number,          // 0–1
      feedback: String,             // null | "up" | "down"
      createdAt: Date
    }
  ],
  archived: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```
**Indexes:** `{ tenantId: 1, userId: 1, updatedAt: -1 }`.

## 6. `audit_logs`

Append-only. Never updated, only inserted.

```js
{
  _id: ObjectId,
  tenantId: ObjectId,
  actorId: ObjectId,           // ref: users._id
  action: String,               // e.g. "document.upload", "document.access", "permission.change", "user.role_change", "auth.login"
  targetType: String,           // "document" | "user" | "permission" | "session"
  targetId: ObjectId,
  metadata: Object,              // action-specific extra detail (e.g. { fromRole, toRole })
  ipAddress: String,
  createdAt: Date
}
```
**Indexes:** `{ tenantId: 1, createdAt: -1 }`, `{ tenantId: 1, actorId: 1 }`, `{ tenantId: 1, targetType: 1, targetId: 1 }`.

## 7. `feedback_events` (evaluation pipeline)

Denormalized from conversation feedback so evaluation queries don't scan full conversation documents.

```js
{
  _id: ObjectId,
  tenantId: ObjectId,
  conversationId: ObjectId,
  messageId: ObjectId,
  rating: String,                // "up" | "down"
  retrievalScoreAtTime: Number,
  reviewed: Boolean,               // true once an admin has triaged a "down" for hallucination review
  reviewNotes: String,
  createdAt: Date
}
```

## 8. `ingestion_jobs`

Backing store for the async ingestion queue (or metadata mirror if using BullMQ/Redis for the actual queue).

```js
{
  _id: ObjectId,
  tenantId: ObjectId,
  documentId: ObjectId,
  stage: String,                 // "extraction" | "chunking" | "embedding" | "indexing" | "done" | "failed"
  attempts: Number,
  lastError: String,
  startedAt: Date,
  completedAt: Date
}
```

## 9. Supabase ↔ MongoDB identity mapping

Supabase's own Postgres store keeps `auth.users` (email, hashed password, email-verification state, MFA if enabled later). EKIP never duplicates credentials. The **only** field shared across systems is the Supabase user UUID, stored on `users.supabaseUserId` in MongoDB. All authorization decisions resolve from MongoDB; Supabase is asked only "is this a valid, currently-authenticated identity."

```
Supabase auth.users            MongoDB users
──────────────────             ──────────────
id (uuid)          ───────────▶ supabaseUserId
email                            email (mirrored, read-only in EKIP)
                                 role, department, status  ← EKIP-owned
```

## 10. Entity relationship summary

```
users ──< document_permissions >── documents ──< document_chunks
users ──< conversations
users ──< audit_logs (as actor)
documents ──< ingestion_jobs
conversations.messages ──< feedback_events
```
