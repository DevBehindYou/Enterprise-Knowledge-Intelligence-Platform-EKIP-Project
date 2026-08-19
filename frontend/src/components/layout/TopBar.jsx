import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ChevronDown, Search, LogOut, Settings as SettingsIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export default function TopBar({ onOpenPalette, notificationCount = 0 }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    }
    document.addEventListener('click', handleOutside);
    return () => document.removeEventListener('click', handleOutside);
  }, []);

  const initials = user?.name
    ? user.name.split(' ').slice(0, 2).map((p) => p[0]).join('').toUpperCase()
    : '?';

  return (
    <header className="bg-canvas border-b border-chromeline flex items-center justify-between px-6 h-16 text-white">
      <button
        onClick={onOpenPalette}
        className="flex-1 max-w-[420px] flex items-center gap-2 bg-[#1E1E26] border border-chromeline rounded-full px-4 py-2 text-[#9A9AA6] text-[13px]"
      >
        <Search size={16} />
        <span>Search documents, conversations…</span>
        <kbd className="ml-auto font-mono text-[11px] bg-[#2A2A32] px-1.5 py-0.5 rounded text-[#C7C7D1]">⌘K</kbd>
      </button>

      <div className="flex items-center gap-4">
        <button className="relative w-9 h-9 rounded-full flex items-center justify-center text-[#C7C7D1] hover:bg-[#1E1E26] hover:text-white">
          <Bell size={18} />
          {notificationCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent border-2 border-canvas" />
          )}
        </button>

        <div className="relative" ref={menuRef}>
          <button onClick={() => setMenuOpen((o) => !o)} className="flex items-center gap-2">
            <div className="w-[34px] h-[34px] rounded-full bg-[#2A2A32] flex items-center justify-center text-[13px] font-semibold">
              {initials}
            </div>
            <ChevronDown size={16} className="text-white/60" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-11 bg-surface-raised border border-line rounded-component min-w-[200px] p-2 shadow-2xl z-40">
              <div className="px-2.5 py-2 text-[12.5px] text-ink-muted">
                {user?.name} · {user?.role}
              </div>
              <div className="h-px bg-line my-1.5" />
              <button className="nav-item text-ink w-full" onClick={() => navigate('/settings')}>
                <SettingsIcon size={16} /> Settings
              </button>
              <button className="nav-item text-ink w-full" onClick={logout}>
                <LogOut size={16} /> Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
