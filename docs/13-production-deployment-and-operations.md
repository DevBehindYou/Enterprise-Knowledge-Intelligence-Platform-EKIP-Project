# 13. Production Deployment and Operations Guide

This guide provides exhaustive technical documentation of the production deployment topology, configuration parameters, CORS architecture, and operational procedures for the Enterprise Knowledge Intelligence Platform (EKIP).

---

## 1. Production Architecture Overview

EKIP is deployed in a **Split-Architecture Cloud Model**:

```
 ┌─────────────────────────────────────────────────────────┐
 │                      Client Browser                     │
 └─────────────┬─────────────────────────────┬─────────────┘
               │ HTTPS                       │ HTTPS (WSS)
               ▼                             ▼
 ┌───────────────────────────┐ ┌───────────────────────────┐
 │   Vercel Edge / CDN       │ │   Render Web Service      │
 │   (React 18 + Vite SPA)   │ │   (Node.js / Express BFF) │
 └───────────────────────────┘ └─────────────┬─────────────┘
                                             │
               ┌─────────────────────────────┼─────────────────────────────┐
               ▼                             ▼                             ▼
 ┌───────────────────────────┐ ┌───────────────────────────┐ ┌───────────────────────────┐
 │   MongoDB Atlas M0/M10    │ │   Supabase Storage S3     │ │     Google Gemini AI      │
 │  (Primary DB + Vectors)   │ │   (Zero-Retention Files)  │ │ (Embeddings & Inference)  │
 └───────────────────────────┘ └───────────────────────────┘ └───────────────────────────┘
```

* **Frontend**: Hosted on **Vercel** as a static Single-Page Application (SPA) with global edge caching.
* **Backend**: Hosted on **Render** as a containerized Node.js Web Service.
* **Database & Vectors**: Hosted on **MongoDB Atlas** (M0/M10 tier with Vector Search index `chunk_vector_index`).
* **Object Storage**: Hosted on **Supabase Storage** (S3-compatible protocol) for zero-retention raw document & media hosting.
* **AI & Embeddings**: Hosted on **Google Gemini AI Studio** (`gemini-embedding-001` with 1536 dimensions).

---

## 2. Render Backend Web Service Setup

### 2.1 Service Specifications
* **Environment**: `Node` (v22+)
* **Root Directory**: `backend` *(Critical: Render must execute within the `backend` subdirectory)*
* **Build Command**: `npm install`
* **Start Command**: `node server.js` (or `npm start`)
* **Instance Type**: Free / Starter / Standard

### 2.2 Required Environment Variables

| Variable Name | Required | Example / Format | Purpose |
| :--- | :---: | :--- | :--- |
| `NODE_ENV` | Yes | `production` | Enables production optimizations, secure cookies, and combined logging |
| `MONGODB_URI` | Yes | `mongodb+srv://user:pass@cluster.mongodb.net/?appName=EKIP` | MongoDB Atlas connection string |
| `MONGODB_DB_NAME` | Yes | `EKIPT_Project` | Primary database name |
| `APP_JWT_SECRET` | Yes | `64-char-hex-or-random-string` | Signs in-memory short-lived access JWTs |
| `GEMINI_API_KEY` | Yes | `AIzaSy...` | Google AI Studio key for text embeddings & vector indexing |
| `TRUST_PROXY` | Yes | `1` | Informs Express to trust Render's reverse proxy hops for IP rate limiting |
| `DEFAULT_TENANT_ID` | Yes | `000000000000000000000001` | Default tenant ID for multi-tenant data isolation |
| `FRONTEND_ORIGIN` | Optional | `https://ekip-project.vercel.app` | Primary frontend domain fallback |
| `PORT` | Auto | *(Injected automatically by Render)* | Do not hardcode; Render injects dynamic port |

---

## 3. Vercel Frontend Deployment Setup

### 3.1 Project Settings
* **Framework Preset**: `Vite`
* **Root Directory**: `frontend`
* **Build Command**: `vite build` (or `npm run build`)
* **Output Directory**: `dist`

### 3.2 Environment Variables

| Variable Name | Value | Purpose |
| :--- | :--- | :--- |
| `VITE_API_URL` / `VITE_API_BASE_URL` | `https://ekip-backend.onrender.com` | Base URL pointing to the Render backend API |

### 3.3 Routing and SPA Rewrites (`vercel.json`)
Vercel requires clean UTF-8 JSON without Byte Order Marks (BOM) to route all paths to `index.html`:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

---

## 4. Cross-Origin Resource Sharing (CORS) Architecture

Because the frontend (`vercel.app`) and backend (`onrender.com`) live on separate parent domains, the backend Express layer enforces dynamic origin validation with credentials support in `backend/src/app.js`:

```javascript
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const allowedOrigins = [env.frontendOrigin].filter(Boolean);
      
      const isAllowed =
        allowedOrigins.includes(origin) ||
        (origin && origin.endsWith('.vercel.app')); // Whitelists production & preview branches

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true, // Required for HttpOnly refresh cookie exchange
  })
);
```

---

## 5. Security & Deployment Best Practices
1. **Host-Only Cookies**: `REFRESH_COOKIE_DOMAIN` is left blank in production so the refresh token is scoped strictly to the backend host.
2. **Rate Limiting**: Configured to trust 1 reverse proxy hop (`TRUST_PROXY=1`), ensuring rate limits key off client IPs rather than Render's internal load balancers.
3. **Automated CI/CD**: Both Render and Vercel are connected via GitHub Webhooks to the `main` branch, triggering automated zero-downtime builds upon git push.
