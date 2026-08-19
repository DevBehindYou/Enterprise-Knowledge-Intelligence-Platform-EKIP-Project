# Enterprise Knowledge Intelligence Platform (EKIP)
### Documentation Set — v1.0 — July 2026

This folder is the full documentation package for **EKIP**, an enterprise-grade internal knowledge assistant built on Retrieval-Augmented Generation (RAG). It is written for three audiences at once: engineers picking up the build, the UI/UX team designing the product, and stakeholders scoping timeline and cost.

The stack decided for this build is:

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite, JavaScript (no TypeScript), Tailwind CSS |
| Backend / API | Node.js + Express (BFF layer) |
| Primary database | MongoDB Atlas (documents, users, permissions, conversations, audit logs) |
| Vector store | MongoDB Atlas Vector Search (native `$vectorSearch`, same cluster as the primary DB) |
| Authentication | Supabase Auth (email/password, JWT-based), fronted by the Express BFF |
| Session transport | Short-lived JWT in memory (frontend) + HttpOnly, Secure, SameSite refresh cookie (backend-issued) |
| LLM | Provider-agnostic adapter — OpenAI / Anthropic / local Llama 3.1 via Ollama |
| Embeddings | OpenAI `text-embedding-3-small` (swappable via adapter) |

> **Why MongoDB Atlas Vector Search instead of a separate Qdrant/Chroma instance?** The original research brief proposed a standalone vector DB. Since MongoDB is already the system of record here, using Atlas Vector Search keeps embeddings, metadata, and permissions in one cluster, one query language, and one place to enforce row-level security via `$vectorSearch` pre-filters. This removes an entire service from the deployment footprint. A migration path to Qdrant is documented in `02-system-architecture.md` for teams that outgrow a single cluster.

---

## How to use this package

| # | File | Audience | Purpose |
|---|---|---|---|
| 01 | `01-brd-srs.md` | Product, stakeholders, engineering | Business requirements + full software requirements spec |
| 02 | `02-system-architecture.md` | Engineering | System architecture, MVVM pattern, RAG pipeline, security model, deployment |
| 03 | `03-database-schema.md` | Engineering | MongoDB collection schemas, indexes, Supabase↔Mongo identity mapping |
| 04 | `04-api-documentation.md` | Engineering, frontend | REST API contract for every endpoint the frontend calls |
| 05 | `05-uiux-design-system.md` | **UI/UX design team** | Design tokens, style guide, motion, accessibility floor |
| 06 | `06-pages-and-user-flows.md` | **UI/UX design team**, product | Full page inventory, wireframe-level layout notes, per-role user flows |
| 07 | `07-component-library.md` | **UI/UX design team**, engineering | Component inventory mapped to the MVVM layering, states, props-level behavior |
| 08 | `08-roadmap-and-repo-structure.md` | Engineering, PM | Phased roadmap, repo/folder layout, environment variables, done-criteria |
| 09 | `09-security-audit-report.docx` | Engineering, security, leadership | Adversarial security review: 9 findings, evidence, fixes, and re-verification |
| 10 | `10-deployment-guide.docx` | Engineering, DevOps | Production deployment topology, environment setup, CI/CD, monitoring, rollback |
| 11 | `11-credentials-and-secrets-management.docx` | Engineering, DevOps, security | Secrets inventory, handling principles, incident response |
| 12 | `12-architecture.docx` | Engineering, leadership | Polished architecture reference, including the security hardening layer |
| 13 | `13-production-deployment-and-operations.md` | DevOps, Engineering | Vercel + Render split deployment, CORS config, env variables |
| 14 | `14-backend-cold-start-and-reliability-guide.md` | Frontend, DevOps | Free-tier cold-start handling, health check service, shimmer progress |
| 15 | `15-custom-dialog-and-notification-system.md` | Frontend, Product | Custom modal dialogs, real-time notifications, 110+ master seed docs |

Read order: **01 → 02 → 03/04 (parallel) → 05 → 06 → 07 → 08 → 09 → 10 → 11 → 12 → 13 → 14 → 15.** The UI/UX team can jump straight to 05–07 but should skim 01 and 06's flow sections first for context on the three user roles. Anyone standing up a real deployment should read 09–11 before going further than a local dev environment.

---

## One-paragraph pitch

Employees waste hours digging through SharePoint folders, PDFs, and Confluence pages to find a single line in a policy document. EKIP replaces that hunt with a chat interface that answers in plain language and always shows its source — page number, section, and a confidence indicator — so the answer is never a black box. Admins control exactly who can see what, every retrieval is logged, and managers get visibility into what their teams are actually asking. It is designed to look and feel like an internal product, not a chatbot demo.

## Design inspiration note

The visual direction (see `05-uiux-design-system.md`) is built from a reference screenshot supplied for this project: a dark charcoal frame holding a light, rounded content canvas, with a single saturated indigo-blue accent and a black accent bar used for date/status tabs. That two-tone tab treatment became this product's signature UI motif — the **Citation Chip** — used everywhere an answer needs to show its receipt.
