import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import Tabs from '../components/foundations/Tabs.jsx';
import Input from '../components/foundations/Input.jsx';
import Button from '../components/foundations/Button.jsx';
import Modal from '../components/foundations/Modal.jsx';
import StorageIntegrationTab from '../components/composite/StorageIntegrationTab.jsx';
import AiIntegrationTab from '../components/composite/AiIntegrationTab.jsx';

/** Inline success/error line shared by the self-service tabs. */
function FormNote({ note }) {
  if (!note) return null;
  const Icon = note.ok ? CheckCircle2 : AlertCircle;
  return (
    <div
      className={`flex items-start gap-2 text-[12.5px] mb-3 p-3 rounded-component ${
        note.ok ? 'bg-success-tint text-[#146C48]' : 'bg-danger-tint text-[#B3282C]'
      }`}
    >
      <Icon size={14} className="mt-px shrink-0" />
      <span>{note.message}</span>
    </div>
  );
}

function ProfileTab() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [note, setNote] = useState(null);

  useEffect(() => {
    setName(user?.name || '');
  }, [user?.name]);

  const initials =
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0])
      .join('')
      .toUpperCase() || '—';

  const isDirty = name.trim() !== (user?.name || '');

  const save = async () => {
    setIsSaving(true);
    setNote(null);
    try {
      await updateProfile({ name: name.trim() });
      setNote({ ok: true, message: 'Profile updated.' });
    } catch (err) {
      setNote({ ok: false, message: err.response?.data?.error?.message || 'Could not save your profile.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-lg card">
      <div className="flex items-center gap-4 mb-5">
        <div className="w-14 h-14 rounded-full bg-accent-tint text-accent-dim flex items-center justify-center text-lg font-semibold">
          {initials}
        </div>
        <div className="text-[12.5px] text-ink-muted">
          Your initials are used as your avatar.
          <br />
          Custom photo uploads aren't available yet.
        </div>
      </div>

      <FormNote note={note} />
      <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
      <Input label="Email" value={user?.email || ''} disabled hint="Managed by your identity provider." />
      <Input label="Department" value={user?.department || ''} disabled hint="Only an admin can change this." />
      <Input label="Role" value={user?.role || ''} disabled hint="Only an admin can change this." />
      <Button onClick={save} loading={isSaving} disabled={!isDirty || !name.trim()}>
        Save changes
      </Button>
    </div>
  );
}

function SecurityTab() {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [note, setNote] = useState(null);

  const mismatch = confirmPassword.length > 0 && newPassword !== confirmPassword;
  const canSubmit = currentPassword && newPassword.length >= 8 && newPassword === confirmPassword;

  const submit = async () => {
    setIsSaving(true);
    setNote(null);
    try {
      await changePassword({ currentPassword, newPassword });
      setNote({ ok: true, message: 'Password updated. Your other devices stay signed in until you end those sessions.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setNote({ ok: false, message: err.response?.data?.error?.message || 'Could not update your password.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-lg card">
      <FormNote note={note} />
      <Input
        label="Current password"
        type="password"
        autoComplete="current-password"
        value={currentPassword}
        onChange={(e) => setCurrentPassword(e.target.value)}
      />
      <Input
        label="New password"
        type="password"
        autoComplete="new-password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        hint="At least 8 characters, including a letter and a number."
      />
      <Input
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        error={mismatch ? "These passwords don't match." : undefined}
      />
      <Button onClick={submit} loading={isSaving} disabled={!canSubmit}>
        Update password
      </Button>
    </div>
  );
}

function NotificationsTab() {
  const { user, updateProfile } = useAuth();
  const prefs = user?.notificationPreferences || {};
  const [documentUpdates, setDocumentUpdates] = useState(prefs.documentUpdates ?? true);
  const [weeklyDigest, setWeeklyDigest] = useState(prefs.weeklyDigest ?? false);
  const [isSaving, setIsSaving] = useState(false);
  const [note, setNote] = useState(null);

  useEffect(() => {
    setDocumentUpdates(user?.notificationPreferences?.documentUpdates ?? true);
    setWeeklyDigest(user?.notificationPreferences?.weeklyDigest ?? false);
  }, [user?.notificationPreferences]);

  const isDirty =
    documentUpdates !== (prefs.documentUpdates ?? true) || weeklyDigest !== (prefs.weeklyDigest ?? false);

  const save = async () => {
    setIsSaving(true);
    setNote(null);
    try {
      await updateProfile({ notificationPreferences: { documentUpdates, weeklyDigest } });
      setNote({ ok: true, message: 'Notification preferences saved.' });
    } catch (err) {
      setNote({ ok: false, message: err.response?.data?.error?.message || 'Could not save your preferences.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-lg card">
      <FormNote note={note} />
      <div className="flex flex-col gap-4 mb-5">
        <label className="flex justify-between items-center gap-4 text-[13.5px] cursor-pointer">
          Email me when a document I asked about is updated
          <input
            type="checkbox"
            checked={documentUpdates}
            onChange={(e) => setDocumentUpdates(e.target.checked)}
          />
        </label>
        <label className="flex justify-between items-center gap-4 text-[13.5px] cursor-pointer">
          Email me a weekly digest of my activity
          <input type="checkbox" checked={weeklyDigest} onChange={(e) => setWeeklyDigest(e.target.checked)} />
        </label>
      </div>
      <Button onClick={save} loading={isSaving} disabled={!isDirty}>
        Save preferences
      </Button>
    </div>
  );
}

function SessionsTab() {
  const { logoutEverywhere } = useAuth();
  const navigate = useNavigate();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [note, setNote] = useState(null);

  const endAll = async () => {
    setIsWorking(true);
    try {
      await logoutEverywhere();
      navigate('/login', { replace: true });
    } catch (err) {
      setNote({ ok: false, message: err.response?.data?.error?.message || 'Could not end your sessions.' });
      setIsWorking(false);
      setIsConfirmOpen(false);
    }
  };

  return (
    <div className="max-w-2xl card">
      <FormNote note={note} />
      <p className="text-[13px] text-ink-muted mb-4 leading-relaxed">
        EKIP uses short-lived tokens rather than long-lived server sessions, so a per-device list isn't
        available. Ending all sessions immediately invalidates every token issued for your account — including
        this browser — everywhere you're signed in.
      </p>
      <table className="w-full mb-5">
        <thead>
          <tr className="text-left text-xs text-ink-muted uppercase">
            <th className="pb-2.5 border-b border-line">Device</th>
            <th className="pb-2.5 border-b border-line">Last active</th>
            <th className="pb-2.5 border-b border-line"></th>
          </tr>
        </thead>
        <tbody className="text-[13px]">
          <tr>
            <td className="py-3 border-b border-line">This browser</td>
            <td className="py-3 border-b border-line">Active now</td>
            <td className="py-3 border-b border-line text-right">
              <span className="badge badge-success">This device</span>
            </td>
          </tr>
        </tbody>
      </table>
      <Button variant="danger" onClick={() => setIsConfirmOpen(true)}>
        Log out of all devices
      </Button>

      <Modal isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} title="Log out everywhere?">
        <p className="text-[13px] text-ink-muted mb-5 leading-relaxed">
          You'll be signed out on every device, including this one, and will need to log in again.
        </p>
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setIsConfirmOpen(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={endAll} loading={isWorking}>
            Log out everywhere
          </Button>
        </div>
      </Modal>
    </div>
  );
}

export default function Settings() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Integration tabs hold third-party credentials — admin only, and hidden
  // rather than shown-and-disabled so the nav doesn't advertise what it can't open.
  const tabs = [
    { key: 'profile', label: 'Profile' },
    { key: 'security', label: 'Security' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'sessions', label: 'Sessions' },
    ...(isAdmin
      ? [
          { key: 'storage', label: 'Storage Integration' },
          { key: 'ai', label: 'AI Integration' },
        ]
      : []),
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-ink-muted text-[13.5px] mt-1.5">
          {isAdmin
            ? 'Manage your account, and configure the storage and AI providers this workspace uses.'
            : 'Manage your account and preferences.'}
        </p>
      </div>

      <Tabs tabs={tabs}>
        {(active) => (
          <>
            {active === 'profile' && <ProfileTab />}
            {active === 'security' && <SecurityTab />}
            {active === 'notifications' && <NotificationsTab />}
            {active === 'sessions' && <SessionsTab />}
            {active === 'storage' && isAdmin && <StorageIntegrationTab />}
            {active === 'ai' && isAdmin && <AiIntegrationTab />}
          </>
        )}
      </Tabs>
    </div>
  );
}
