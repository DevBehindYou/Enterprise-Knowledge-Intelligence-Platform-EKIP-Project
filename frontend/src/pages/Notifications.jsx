import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, CheckCircle, Sparkles, Bell as BellIcon, Check, ExternalLink } from 'lucide-react';
import { apiClient } from '../lib/apiClient.js';
import Button from '../components/foundations/Button.jsx';
import Skeleton from '../components/foundations/Skeleton.jsx';

const TYPE_ICONS = {
  document: FileText,
  feedback: CheckCircle,
  system: BellIcon,
  summary: Sparkles
};

export default function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'unread'
  const navigate = useNavigate();

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function fetchNotifications() {
    try {
      setIsLoading(true);
      const res = await apiClient.get('/notifications');
      setNotifications(res.data.notifications || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleMarkAllRead() {
    try {
      await apiClient.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  }

  async function handleNotificationClick(n) {
    if (!n.read) {
      try {
        await apiClient.patch(`/notifications/${n._id}/read`);
        setNotifications((prev) =>
          prev.map((item) => (item._id === n._id ? { ...item, read: true } : item))
        );
      } catch (err) {
        console.error('Failed to mark read:', err);
      }
    }
    if (n.link) {
      navigate(n.link);
    }
  }

  const unreadCount = notifications.filter((n) => !n.read).length;
  const displayed = filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Notifications</h1>
          <p className="text-ink-muted text-[13.5px] mt-1.5">
            Real-time updates on documents, vector embeddings, and system activities.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-surface-raised border border-line rounded-lg p-1">
            <button
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                filter === 'all' ? 'bg-ink text-white' : 'text-ink-muted hover:text-ink'
              }`}
              onClick={() => setFilter('all')}
            >
              All ({notifications.length})
            </button>
            <button
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                filter === 'unread' ? 'bg-ink text-white' : 'text-ink-muted hover:text-ink'
              }`}
              onClick={() => setFilter('unread')}
            >
              Unread ({unreadCount})
            </button>
          </div>
          {unreadCount > 0 && (
            <Button variant="secondary" size="sm" onClick={handleMarkAllRead}>
              <Check size={14} className="mr-1.5" /> Mark all read
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2.5 max-w-3xl">
        {isLoading && (
          <>
            <Skeleton className="h-16 w-full rounded-component" />
            <Skeleton className="h-16 w-full rounded-component" />
            <Skeleton className="h-16 w-full rounded-component" />
          </>
        )}

        {!isLoading && displayed.length === 0 && (
          <div className="card text-center p-12 border-dashed border-line">
            <BellIcon className="mx-auto text-ink-muted mb-3 opacity-40" size={32} />
            <div className="text-sm font-semibold text-ink">No notifications</div>
            <p className="text-xs text-ink-muted mt-1">
              {filter === 'unread' ? 'You have caught up with all updates!' : 'No notifications recorded yet.'}
            </p>
          </div>
        )}

        {!isLoading &&
          displayed.map((n) => {
            const Icon = TYPE_ICONS[n.type] || BellIcon;
            return (
              <div
                key={n._id}
                onClick={() => handleNotificationClick(n)}
                className={`card-flat flex items-center gap-4 cursor-pointer transition-all hover:border-accent/40 ${
                  !n.read ? 'bg-accent-tint/10 border-accent/30' : ''
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    !n.read ? 'bg-accent/15 text-accent' : 'bg-surface-raised text-ink-muted'
                  }`}
                >
                  <Icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[13.5px] truncate ${!n.read ? 'font-semibold text-ink' : 'text-ink/85'}`}>
                      {n.title}
                    </span>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />}
                  </div>
                  {n.message && <div className="text-xs text-ink-muted mt-0.5 line-clamp-1">{n.message}</div>}
                  <div className="text-[11px] text-ink-muted/80 mt-1">
                    {new Date(n.createdAt).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
                {n.link && <ExternalLink size={15} className="text-ink-muted/60 flex-shrink-0" />}
              </div>
            );
          })}
      </div>
    </div>
  );
}
