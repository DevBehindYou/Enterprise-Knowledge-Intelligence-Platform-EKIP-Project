import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import TopBar from './TopBar.jsx';
import CommandPalette from '../composite/CommandPalette.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

/**
 * Wraps every authenticated route. Sidebar visibility is role-derived once,
 * here — individual pages never re-check "should I show the admin nav."
 */
export default function AppShell() {
  const { user } = useAuth();
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);

  return (
    <div className="grid h-screen" style={{ gridTemplateColumns: '264px 1fr', gridTemplateRows: '64px 1fr' }}>
      <div style={{ gridRow: '1 / span 2' }}>
        <Sidebar role={user?.role} />
      </div>
      <TopBar onOpenPalette={() => setIsPaletteOpen(true)} />
      <main className="bg-surface rounded-tl-card p-8 overflow-y-auto">
        <Outlet />
      </main>
      <CommandPalette isOpen={isPaletteOpen} onClose={(shouldClose) => setIsPaletteOpen(!shouldClose)} />
    </div>
  );
}
