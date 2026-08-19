import { Routes, Route } from 'react-router-dom';

import RequireAuth from './RequireAuth.jsx';
import RequireRole from './RequireRole.jsx';
import AppShell from '../components/layout/AppShell.jsx';

import Login from '../pages/Login.jsx';
import Signup from '../pages/Signup.jsx';
import ForgotPassword from '../pages/ForgotPassword.jsx';
import ErrorPage from '../pages/ErrorPage.jsx';

import Dashboard from '../pages/Dashboard.jsx';
import Chat from '../pages/Chat.jsx';
import ConversationHistory from '../pages/ConversationHistory.jsx';
import DocumentLibrary from '../pages/DocumentLibrary.jsx';
import DocumentPreview from '../pages/DocumentPreview.jsx';
import DocumentSummarizer from '../pages/DocumentSummarizer.jsx';
import Notifications from '../pages/Notifications.jsx';
import Settings from '../pages/Settings.jsx';
import FileManager from '../pages/FileManager.jsx';
import Analytics from '../pages/Analytics.jsx';

import AdminUsers from '../pages/admin/AdminUsers.jsx';
import AdminDocuments from '../pages/admin/AdminDocuments.jsx';
import AdminPermissions from '../pages/admin/AdminPermissions.jsx';
import AdminAudit from '../pages/admin/AdminAudit.jsx';
import AdminEvaluation from '../pages/admin/AdminEvaluation.jsx';
import AdminSystem from '../pages/admin/AdminSystem.jsx';

/**
 * Full route table — mirrors docs/06-pages-and-user-flows.md 1:1 so there's no
 * drift between the page inventory the design team works from and what's wired here.
 */
export default function AppRoutes() {
  return (
    <Routes>
      {/* ---- Public ---- */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/error/403" element={<ErrorPage code={403} />} />
      <Route path="/error/404" element={<ErrorPage code={404} />} />
      <Route path="/error/500" element={<ErrorPage code={500} />} />

      {/* ---- Authenticated ---- */}
      <Route element={<RequireAuth />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/chat/:conversationId" element={<Chat />} />
          <Route path="/conversations" element={<ConversationHistory />} />
          <Route path="/documents" element={<DocumentLibrary />} />
          <Route path="/documents/:id" element={<DocumentPreview />} />
          <Route path="/documents/:id/summarize" element={<DocumentSummarizer />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/settings" element={<Settings />} />
          {/* Reads are open to any authenticated user; every mutation is
              admin-gated in the API and hidden in the UI (see filesController). */}
          <Route path="/files" element={<FileManager />} />

          {/* ---- Manager + Admin ---- */}
          <Route element={<RequireRole roles={['manager', 'admin']} />}>
            <Route path="/analytics" element={<Analytics />} />
          </Route>

          {/* ---- Admin only ---- */}
          <Route element={<RequireRole roles={['admin']} />}>
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/documents" element={<AdminDocuments />} />
            <Route path="/admin/permissions" element={<AdminPermissions />} />
            <Route path="/admin/audit" element={<AdminAudit />} />
            <Route path="/admin/evaluation" element={<AdminEvaluation />} />
            <Route path="/admin/system" element={<AdminSystem />} />
          </Route>
        </Route>
      </Route>

      {/* ---- Fallback ---- */}
      <Route path="*" element={<ErrorPage code={404} />} />
    </Routes>
  );
}
