# EKIP — UI/UX Design System
### For the design team — v1.0

## 0. Direction, in one sentence

A dark chrome frame holding a light, quiet content canvas, with exactly one saturated indigo accent and a black-bar tab treatment — enterprise-serious, not chatbot-playful.

This is built directly from the reference screenshot supplied for the project (a "CVAT Digest" product-update card): a near-black rounded frame, a light gray-white inset card, a bold geometric wordmark, thin hairline rules, and — the detail that matters most — a two-tone tab in the footer where a black bar sits above a solid indigo block containing a date. That tab is the seed for this product's one signature element (§5).

---

## 1. Color tokens

| Token | Hex | Use |
|---|---|---|
| `--color-canvas-dark` | `#14141A` | App chrome: top bar, sidebar, outer frame background |
| `--color-chrome-line` | `#2A2A32` | Hairlines/dividers on dark chrome |
| `--color-surface` | `#EDEDEA` | Primary light content canvas (cards, page background inside the shell) |
| `--color-surface-raised` | `#F6F6F4` | Cards-on-cards, modals, popovers |
| `--color-ink` | `#111114` | Primary text on light surface |
| `--color-ink-muted` | `#5B5B63` | Secondary text, captions, metadata |
| `--color-line` | `#D8D8D4` | Hairlines/dividers on light surface |
| `--color-accent` | `#3D46F5` | The one accent: primary buttons, links, active states, focus rings, chat "assistant" affordances |
| `--color-accent-dim` | `#2B32C4` | Hover/pressed state of accent |
| `--color-accent-tint` | `#E4E5FD` | Accent background wash (e.g., selected row, info banner) |
| `--color-signal-black` | `#0B0B0D` | The black accent bar in the Citation Chip and status tabs |
| `--color-success` | `#1FA971` | Ingestion "ready," permission granted |
| `--color-warning` | `#D98C15` | "Processing," medium risk flag |
| `--color-danger` | `#E5484D` | Ingestion failed, permission denied, high risk flag |

Exactly one saturated hue (`--color-accent`) is permitted per screen. Status colors (success/warning/danger) are reserved strictly for system state, never decoration.

## 2. Typography

| Role | Typeface | Weights | Notes |
|---|---|---|---|
| Display / page titles | **Space Grotesk** | 500, 600, 700 | Geometric, rounded terminals — echoes the wordmark's character in the reference image. Used sparingly: page `<h1>`s and the empty-state headlines only. |
| UI / body | **Inter** | 400, 500, 600 | Everything else: labels, body copy, chat text, table cells, nav. |
| Mono / technical | **IBM Plex Mono** | 400, 500 | Document IDs, timestamps, confidence scores, page/section citations, audit log rows — anywhere a value should read as "data," not prose. |

**Type scale:** `12 / 14 / 16 / 18 / 22 / 28 / 36` px, line-height 1.4 for body, 1.15 for display. Never introduce a size outside this scale.

## 3. Shape & spacing

- Outer chrome radius: **28px**. Inner light-canvas card radius: **20px**. Standard component radius (buttons, inputs, cards): **10px**. Pills/badges: **999px** (full).
- Spacing scale (px): **4, 8, 12, 16, 24, 32, 48, 64** — no arbitrary values.
- Max content width: **1280px**, 12-column grid, 24px gutter.
- Sidebar width: **264px** (expanded), **72px** (collapsed, icon-only).

## 4. Elevation & hairlines

This system favors **hairline dividers over drop shadows** — matching the reference image's flat, rule-based structure. Use `1px solid var(--color-line)` (light surfaces) or `var(--color-chrome-line)` (dark chrome) to separate sections. Reserve shadow (`0 4px 16px rgba(0,0,0,0.12)`) for genuinely floating elements only: modals, dropdowns, toasts, the command/search palette.

## 5. Signature element — the Citation Chip

The one memorable, repeated device across the whole product, lifted directly from the reference image's two-tone footer tab (black bar over a solid indigo block bearing a date).

```
┌──────────────────┐
│ ▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮ │  ← 4px solid signal-black cap
├──────────────────┤
│  Travel_Policy    │  ← solid accent-indigo fill, white Inter 500 text
│  .pdf · p.4       │     mono for the page reference
└──────────────────┘
```

Rules for its use:
- Appears on every AI-generated answer, directly under the answer text, one chip per citation.
- Always the black cap + solid indigo fill combination — this exact pairing is reserved for citations only, so a user learns to associate it with "this claim has a receipt."
- Clicking a chip opens the source document scrolled to the cited page/section, with the relevant chunk highlighted in `--color-accent-tint`.
- Never used decoratively elsewhere — if it starts appearing on non-cited content, that's a design bug, not a stylistic choice.

## 6. Accessibility floor (non-negotiable)

- Contrast: body text on `--color-surface` and `--color-canvas-dark` both verified ≥ 4.5:1 (WCAG 2.1 AA).
- Every interactive element has a visible focus ring: `2px solid var(--color-accent)` with 2px offset — never removed, only restyled.
- All chat/document actions reachable by keyboard alone (tab order follows visual order).
- Motion respects `prefers-reduced-motion`: transitions drop to opacity-only, no slide/scale, when set.
- Color is never the only signal — status (ready/processing/failed, permission granted/denied) always pairs a color with an icon and a text label.

## 7. Motion

Minimal and functional, not ambient:
- Page/section transitions: 150ms ease-out opacity + 4px translate — nothing more.
- Chat message arrival: text streams in (typewriter-style token reveal), the one place motion is expected and useful.
- Citation Chip on hover: background shifts to `--color-accent-dim`, 100ms — no scale/bounce.
- No looping background animation, no parallax. The reference image's stillness (a static, confident layout) is the intended feeling.

## 8. Voice & microcopy

- Buttons name the action, not the mechanism: **"Upload document"** not "Submit," **"Ask"** not "Send query."
- Empty states are invitations, not apologies: *"No documents yet — upload your first policy to get started."* not *"No data found."*
- Errors state what happened and what to do, in the interface's voice: *"This document couldn't be processed. Try re-uploading, or contact your admin if the problem continues."*
- The assistant never invents confidence it doesn't have: when ungrounded, it says so plainly — *"I couldn't find this in any document you have access to."*

## 9. Component-level style notes (see `07-component-library.md` for full inventory)

- **Buttons:** primary = solid `--color-accent` fill, white text, 10px radius. Secondary = 1px `--color-line` border, `--color-ink` text, transparent fill. Destructive = `--color-danger` outline, filled only on confirm step.
- **Inputs:** 1px `--color-line` border on `--color-surface-raised`, focus ring per §6, 10px radius, 12/16px vertical/horizontal padding.
- **Badges (role/status, not citations):** pill shape, `--color-surface-raised` background, `--color-ink-muted` text, uppercase, letter-spacing 0.04em, 11px — distinct from the Citation Chip so the two are never confused.
- **Tables (document library, audit log):** hairline row dividers only, no zebra striping, mono for numeric/ID columns.
- **ConfidenceMeter:** a thin horizontal bar, filled proportionally in `--color-accent` (high), `--color-warning` (medium), or `--color-danger` (low), with the numeric score in mono beside it — never a bare percentage with no visual weight.

## 10. What to hand the design team next

- Figma file structure should mirror `05 → 06 → 07`: a **Foundations** page (this doc, as tokens/styles), a **Pages** page (one frame per entry in `06-pages-and-user-flows.md`), and a **Components** page (one frame per entry in `07-component-library.md`).
- Any new pattern proposed outside this doc should be checked against §5–§7 before it ships: does it reuse the Citation Chip motif where relevant, does it hold to the hairline-over-shadow rule, does it stay within the one-accent-color rule.
