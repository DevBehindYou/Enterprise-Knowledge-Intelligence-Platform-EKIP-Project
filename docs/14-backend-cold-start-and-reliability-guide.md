# 14. Render Free-Tier Cold-Start and Reliability Guide

This document describes the architectural solution implemented to handle Render free-tier spinning down (cold starts) with an automated warm-up pipeline, indeterminate progress feedback, and client-side login protection.

---

## 1. Problem Statement: Free-Tier Cold Starts

On Render's free tier, backend instances automatically spin down to 0 replicas after **15 minutes of inactivity**. When a new HTTP request hits a sleeping service:
* The container takes **50 to 75 seconds** to allocate compute, download image layers, boot Node.js, and establish MongoDB connections.
* Standard frontend applications without cold-start mitigation appear frozen, broken, or throw immediate `502 Bad Gateway` / `Network Error` upon login submission.

---

## 2. The Multi-Layer Warm-Up Solution

EKIP handles cold starts gracefully through a 4-pillar architectural system:

```
[User Visits /login]
         │
         ▼
[1. Immediate Health Ping] ─── (Lightweight GET /api/health) ───► [Render Backend Spins Up]
         │
         ▼
[2. Visual Feedback] ────────► (Shimmer Progress Bar + "Waking up server..." status banner)
         │
         ▼
[3. Login Protection] ───────► (Submit button disabled; inputs remain interactive)
         │
         ▼
[4. State Transition] ───────► (200 OK received → Session Cached → "Server ready" → Login Enabled)
```

---

## 3. Component Architecture & Implementation Details

### 3.1 Backend Health Service (`backendHealthService.js`)
* **Endpoint Target**: `/api/health` (unauthenticated, lightweight, verifies MongoDB readyState in < 1ms).
* **Deduplication**: Uses a shared module-level promise (`inFlightWarmupPromise`) so concurrent page views or components attach to the same active polling sequence.
* **Session Caching**: When healthy, stores `ekip_backend_warm = 'true'` in `sessionStorage` and in-memory variable `isKnownWarm`. Subsequent route transitions within the session skip cold-start checks.
* **Polling Pacing**: Pings every 3.5 seconds with an 8-second per-request timeout for up to 20 attempts (~70s total).

### 3.2 Global Health Context (`BackendHealthContext.jsx`)
* Exposes the `useBackendHealth()` React hook across the entire application tree.
* Returns:
  - `status`: `'idle' | 'warming' | 'ready' | 'error'`
  - `isWarming`: `boolean`
  - `isReady`: `boolean`
  - `isError`: `boolean`
  - `attempt`: Current retry count
  - `retryWarmup()`: Function to manually re-trigger the warm-up cycle.

### 3.3 UI Status Banner (`BackendStatusBanner.jsx`)
* **Top Indeterminate Shimmer**: A glowing 3px animated gradient progress bar spanning the top of the auth card that continuously moves without implying fake percentages.
* **Warming Pill**: An amber pulsing radar dot accompanied by clear context:
  > *"Render free-tier spin up in progress. This may take up to a minute on the first connection."*
* **Ready State**: Fades smoothly into a green checkmark pill:
  > *"Server ready — you can now log in."*
* **Error / Timeout State**: Renders an alert box with an interactive **"Retry connection"** button if the backend exceeds 70 seconds.

### 3.4 Login Flow Integration (`Login.jsx`, `Signup.jsx`, `ForgotPassword.jsx`)
* **Non-Blocking Inputs**: Email and password fields remain interactive so the user can immediately type credentials without waiting.
* **Submission Guard**: Disables the submit button while `isWarming` (displaying `"Waking up server..."`), preventing failed HTTP requests.

---

## 4. State Diagram

```
       [ App Mounted ]
              │
      Is Session Warm?
       /            \
     (Yes)          (No)
      /               \
[ status: ready ]   [ status: warming ]
                       │
                 GET /api/health
                 /             \
             (200 OK)       (Timeout > 70s)
               /                 \
        [ status: ready ]    [ status: error ]
        - Cache in Session    - Show Retry Button
        - Enable Form Actions
```
