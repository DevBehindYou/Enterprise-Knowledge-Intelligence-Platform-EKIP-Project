# 15. Custom Dialogs, Notifications, and Knowledge Seeding

This guide details the custom modal dialog engine, the live real-time notification subsystem, and the master knowledge base seeding infrastructure.

---

## 1. Custom Dialog & Popup Framework

### 1.1 Problem with Native Browser Alerts
Standard browser dialogs (`window.alert`, `window.confirm`, `window.prompt`) break the visual immersion of dark-themed modern web applications, look like security popups in production URLs, and block the main JavaScript execution thread.

### 1.2 The DialogContext Architecture (`DialogContext.jsx`)
EKIP replaces all native dialogs with a Promise-based React Context:

```javascript
import { useDialog } from '../context/DialogContext.jsx';

function MyComponent() {
  const { confirm, prompt, alert } = useDialog();

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete conversation',
      message: 'Are you sure you want to delete this thread? This cannot be undone.',
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (confirmed) {
      // Execute delete
    }
  };
}
```

### 1.3 Key Features
* **Promise-Based API**: Functions return native Promises (`Promise<boolean>` for confirm, `Promise<string|null>` for prompt), allowing clean async/await syntax.
* **Frosted Backdrop**: Dark blurred overlay (`backdrop-blur-sm bg-black/60`).
* **Variant Styling**: Supports `danger` (red CTA button + warning icon), `primary` (indigo CTA), and `success`.
* **Keyboard Accessibility**: Supports `Enter` (confirm/submit) and `Escape` (cancel/dismiss).

---

## 2. Real-Time Notification Subsystem

### 2.1 Backend Architecture
* **Model** (`backend/src/models/Notification.js`):
  - Fields: `tenantId`, `userId`, `title`, `message`, `type` (`document` | `feedback` | `system` | `summary`), `link`, `read`, `createdAt`.
* **Controller** (`backend/src/controllers/notificationsController.js`):
  - `GET /api/notifications`: Retrieves tenant notifications; dynamically bootstraps starter notifications for recent document uploads if collection is empty.
  - `PATCH /api/notifications/read-all`: Marks all unread notifications as read.
  - `PATCH /api/notifications/:id/read`: Marks a single notification as read.

### 2.2 Frontend Integration
* **TopBar Bell Badge** (`TopBar.jsx`):
  - Fetches unread count and renders a pulsing blue notification dot.
  - Clicking the bell navigates directly to `/notifications`.
* **Notifications Dashboard** (`Notifications.jsx`):
  - Interactive **All vs. Unread** filter toggles.
  - One-click **"Mark all read"** button updating MongoDB in real-time.
  - Direct navigation links (`ExternalLink`) to referenced documents, audits, or settings.

---

## 3. Master Knowledge Base Dataset

The platform is seeded with **113 enterprise documents** and **18 multi-turn conversation threads** across 8 business domains:

### 3.1 Document Categories & Formats
1. **PDFs**: SOC 2 Type II audit reports, Enterprise Cloud Security Standards, Employee Code of Conduct, Master Services Agreements (MSAs), AI Governance Frameworks, Disaster Recovery Plans.
2. **DOCX (Word)**: Kubernetes Scaling Guides, Incident Response Severity 1 Playbooks, PRD for AI Agents, Partner Reseller Agreements, Ergonomics Manuals, API Standards.
3. **Markdown (.md)**: Git CI/CD Branching, MongoDB Vector Index Tuning, Frontend State Standards, QA Testing Playbooks, GDPR Data Erasure Guides.
4. **CSV (Spreadsheets)**: 3-Year Financial Projections, Q4 Enterprise Sales Pipeline, Headcount & Department Budgets, API Latency & Uptime Metrics, Customer Churn Analysis.
5. **TXT (Plain Text)**: Day 1 Onboarding SOPs, MongoDB Backup SOPs, Security Patch Management SOPs, Sales Demo Playbooks.

### 3.2 File Manager Media Assets
Organized into structured cloud folders with high-resolution infographics:
* **📁 Architecture & Security**: `Enterprise_Cloud_Security_Architecture.jpg`, `Scalable_Cloud_Application_Architecture.jpg`
* **📁 Product & AI Systems**: `End_to_End_AI_and_RAG_Pipeline.jpg`
* **📁 Brand Assets**: `Q4_Executive_Marketing_Banner.jpg`
