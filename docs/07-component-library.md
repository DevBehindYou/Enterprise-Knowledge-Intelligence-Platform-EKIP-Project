# EKIP — Component Library
### For the design team & engineering — mapped to the MVVM frontend layering

Every component below is a **View** in the MVVM sense (`02-system-architecture.md §2`): it receives data and callbacks as props and holds no fetch logic of its own. Where a component is normally paired with a specific ViewModel hook, that's noted so design and engineering stay in sync on where state actually lives.

---

## 1. Foundations

| Component | States | Notes |
|---|---|---|
| **Button** | default / hover / active / disabled / loading | Variants: primary (solid accent), secondary (outline), destructive (danger outline → filled on confirm), ghost (text-only, for toolbar actions) |
| **Input / Textarea** | default / focus / error / disabled | Error state shows a one-line message below in `--color-danger`, never just a red border |
| **Select / Dropdown** | closed / open / selected | Used for filters (department, tag, type) |
| **Checkbox / Toggle** | unchecked / checked / disabled | Toggle used for boolean settings (e.g., "semantic search" on/off) |
| **Badge** (role/status) | neutral / success / warning / danger | Pill shape, per design system §9 — reserved for role labels and system status, never for citations |
| **Avatar** | with image / initials fallback | Initials fallback uses `--color-accent-tint` background, `--color-ink` text |
| **Tooltip** | — | Used for icon-only buttons (collapsed sidebar), confidence-score explanation |
| **Modal / Dialog** | entering / open / exiting | Used for: invite user, upload metadata, confirm delete, permission edit |
| **Toast** | success / error / info | Bottom-right, auto-dismiss 4s (success/info), manual-dismiss (error) |
| **Tabs** | — | Used in Admin Console sections, Document Preview (Content / Metadata / Permissions) |
| **Table** | default / sortable header / row-hover | Hairline dividers only, per design system §4 |
| **Skeleton** | — | Shape-matched loading placeholder, used instead of spinners |
| **Pagination** | — | Used on Document Library, Audit Log, User Management |

---

## 2. Composite components

### CitationChip *(signature component — see design system §5)*
- **Props:** `documentName`, `page` or `section`, `onOpen(chunkId)`
- **States:** default, hover (accent-dim shift), focus-visible ring
- Used exclusively inside `ChatMessageBubble` (assistant role, grounded answers only).

### ChatMessageBubble
- **Props:** `role` (`user`/`assistant`), `text`, `citations[]`, `confidence`, `feedback`, `onFeedback(rating)`, `isStreaming`
- **Paired ViewModel:** `useChatViewModel` — the bubble itself never calls the API; `onFeedback` bubbles up to the hook.
- **States:** streaming (token shimmer), grounded (citations + confidence shown), ungrounded (muted style, no citations/confidence), feedback-given (buttons show selected state, disabled from re-toggling).

### ConfidenceMeter
- **Props:** `score` (0–1), `label` derived from score bands (High ≥ 0.8, Medium 0.5–0.79, Low < 0.5)
- Renders the thin fill bar + mono numeric score per design system §9. Color follows score band, never a bare number alone.

### SourceCard
- **Props:** `documentName`, `page`/`section`, `excerpt` (short, highlighted match)
- Used in Document Preview's "cited here" rail and in the Evaluation Dashboard's hallucination-review detail view.

### DocumentCard
- **Props:** `filename`, `department`, `securityLevel`, `status`, `updatedAt`, `onOpen()`
- **Paired ViewModel:** `useDocumentLibraryViewModel`
- **States:** ready / processing (with subtle status badge) / failed (danger badge + retry affordance, Admin view only).

### UploadDropzone
- **Props:** `onFilesSelected(files)`, `accept` (mime allowlist), `isUploading`, `progress`
- **Paired ViewModel:** `useDocumentUploadViewModel`
- **States:** idle, drag-over (accent border), uploading (progress bar), error (rejected file type/size, inline message).

### RoleBadge
- **Props:** `role` (`employee`/`manager`/`admin`)
- Fixed color mapping so a role reads identically everywhere: employee = neutral, manager = accent-tint, admin = signal-black text on accent-tint.

### AuditLogRow
- **Props:** `actorName`, `action`, `targetLabel`, `timestamp`, `metadata`
- Mono type for `timestamp` and any ID fields inside `metadata`, per design system typography rules.

### PermissionMatrixCell
- **Props:** `accessLevel` (`none`/`view`/`cite`), `onChange(newLevel)`, `isOverride` (true if this cell is a user-specific override rather than the department default)
- **States:** default (department-derived), override (small accent dot indicator so an Admin can tell at a glance which cells were hand-edited).

### CommandPalette / SearchBar
- **Props:** `query`, `onQueryChange`, `results[]`, `isSemanticMode`, `onToggleMode()`
- Lives in the top bar; `⌘K` / `Ctrl+K` shortcut opens it as an overlay (uses the Modal foundation's motion rules).

---

## 3. Layout components

### AppShell
- Wraps every authenticated page: dark `TopBar` + dark `Sidebar` + light `--color-surface` content area (per `06-pages-and-user-flows.md §2`).
- **Props:** `user` (from `AuthContext`), `children`.
- Sidebar item visibility is role-derived here, once, rather than re-checked per page.

### TopBar
- **Props:** `onSearchOpen()`, `notificationCount`, `user`
- Contains: wordmark, global search trigger, notification bell (badge count), avatar menu (Profile, Settings, Log out).

### Sidebar
- **Props:** `role`, `activeRoute`
- Two visual groups when `role === 'admin'`: standard nav, then a divided "Admin console" group — mirrors the page inventory's structure directly so there's no translation gap between IA and nav design.

### AdminShell
- Nested inside `AppShell` for all `/admin/*` routes; swaps the sidebar's active group and adds the Admin-console-specific breadcrumb.

### AuthShell
- Used for Login/Signup/Forgot-password: centered light card on the dark canvas, no top bar/sidebar — this is the frame that most directly quotes the reference image's composition.

---

## 4. Component → ViewModel map (quick reference for engineering)

| Component(s) | ViewModel hook | Backed by service |
|---|---|---|
| Login/Signup forms | `useAuthViewModel` | `authService` |
| ChatMessageBubble, conversation list | `useChatViewModel` | `chatService` |
| DocumentCard, search bar (library) | `useDocumentLibraryViewModel` | `documentService` |
| UploadDropzone, ingestion status badges | `useDocumentUploadViewModel` | `documentService` |
| PermissionMatrixCell | `usePermissionsViewModel` | `permissionService` (via `adminService`) |
| AuditLogRow, filters | `useAuditLogViewModel` | `auditService` (via `adminService`) |
| Analytics charts | `useAnalyticsViewModel` | `analyticsService` |
| User Management table | `useUserManagementViewModel` | `adminService` |

This table is the contract between design and engineering: any new component that needs live data should be traced to one of these hooks (or a new one added to this list) before implementation starts, so state never quietly ends up living inside a View component.
