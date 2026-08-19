import { FileText, Check, Sparkles, Bell as BellIcon } from 'lucide-react';

// In production this list comes from GET /api/notifications (not yet in the v1 API surface —
// see docs/04-api-documentation.md; wire this component to that endpoint once it ships).
const MOCK_NOTIFICATIONS = [
  { id: 1, icon: FileText, title: 'Vendor_Agreement_Acme.pdf finished processing', when: '10 minutes ago', unread: true },
  { id: 2, icon: Check, title: 'Your feedback on "Maternity leave policy" was reviewed', when: '3 hours ago', unread: true },
  { id: 3, icon: Sparkles, title: 'Summary ready for Vendor_Agreement_Acme.pdf', when: 'Yesterday', unread: false },
  { id: 4, icon: BellIcon, title: 'New company-wide announcement from Admin', when: '2 days ago', unread: false },
  { id: 5, icon: FileText, title: 'HR_Manual.docx was updated to v4', when: '1 week ago', unread: false },
];

export default function Notifications() {
  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-ink-muted text-[13.5px] mt-1.5">Updates on documents, summaries, and feedback you've interacted with.</p>
        </div>
        <button className="btn-secondary">Mark all as read</button>
      </div>
      <div className="flex flex-col gap-2 max-w-2xl">
        {MOCK_NOTIFICATIONS.map((n) => (
          <div key={n.id} className="card-flat flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-lg bg-accent-tint text-accent-dim flex items-center justify-center flex-shrink-0">
              <n.icon size={16} />
            </div>
            <div className="flex-1">
              <div className={`text-[13.5px] ${n.unread ? 'font-semibold' : ''}`}>{n.title}</div>
              <div className="text-xs text-ink-muted mt-0.5">{n.when}</div>
            </div>
            {n.unread && <span className="w-2 h-2 rounded-full bg-accent" />}
          </div>
        ))}
      </div>
    </div>
  );
}
