import { NavLink } from 'react-router-dom';
import {
  Home, MessageCircle, Clock, Folder, Bell, Settings, BarChart2,
  Users, FileText, Shield, List, Activity, Server, Sparkles, HardDrive,
} from 'lucide-react';

const COMMON = [
  { to: '/', icon: Home, label: 'Home', end: true },
  { to: '/chat', icon: MessageCircle, label: 'Ask Assistant' },
  { to: '/conversations', icon: Clock, label: 'Conversations' },
  { to: '/documents', icon: Folder, label: 'Documents' },
  { to: '/files', icon: HardDrive, label: 'File Manager' },
  { to: '/notifications', icon: Bell, label: 'Notifications' },
];

const ADMIN = [
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/documents', icon: FileText, label: 'Documents' },
  { to: '/admin/permissions', icon: Shield, label: 'Permissions' },
  { to: '/admin/audit', icon: List, label: 'Audit Log' },
  { to: '/admin/evaluation', icon: Activity, label: 'Evaluation' },
  { to: '/admin/system', icon: Server, label: 'System Health' },
];

function Item({ to, icon: Icon, label, end, onNavigate }) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}
    >
      <Icon size={18} className="shrink-0" />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

export default function Sidebar({ role, onNavigate }) {
  return (
    <aside className="bg-canvas border-r border-chromeline p-3.5 flex flex-col gap-1 text-white h-full overflow-y-auto">
      <div className="flex items-center gap-2.5 px-2.5 pb-5 pt-1.5 font-display font-bold text-lg tracking-wide">
        <span className="w-[26px] h-[26px] bg-accent rounded-lg flex items-center justify-center shrink-0">
          <Sparkles size={14} />
        </span>
        EKIP
      </div>

      {COMMON.map((item) => (
        <Item key={item.to} {...item} onNavigate={onNavigate} />
      ))}

      {(role === 'manager' || role === 'admin') && (
        <Item to="/analytics" icon={BarChart2} label="Analytics" onNavigate={onNavigate} />
      )}

      <div className="h-px bg-chromeline my-3 mx-1" />
      <Item to="/settings" icon={Settings} label="Settings" onNavigate={onNavigate} />

      {role === 'admin' && (
        <>
          <div className="text-[11px] uppercase tracking-wide text-[#6B6B76] px-2.5 pt-4 pb-1.5">Admin console</div>
          {ADMIN.map((item) => (
            <Item key={item.to} {...item} onNavigate={onNavigate} />
          ))}
        </>
      )}
    </aside>
  );
}
