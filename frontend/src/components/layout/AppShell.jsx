import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar.jsx';
import TopBar from './TopBar.jsx';
import CommandPalette from '../composite/CommandPalette.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

/**
 * Wraps every authenticated route. Sidebar visibility is role-derived once,
 * here — individual pages never re-check "should I show the admin nav."
 *
 * Responsive layout: at lg+ this is a two-column grid with the sidebar as a
 * fixed 264px column. Below lg the sidebar becomes an off-canvas drawer (slides
 * in over a backdrop), so small screens get the full width for content instead
 * of losing 264px to permanent chrome.
 */
export default function AppShell() {
  const { user } = useAuth();
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  // Close the mobile drawer on route change so a tapped nav link doesn't leave
  // the drawer covering the page it navigated to.
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [location.pathname]);

  return (
    <div className="h-screen overflow-hidden flex flex-col lg:grid lg:grid-cols-[264px_1fr] lg:grid-rows-[64px_1fr]">
      {/* Backdrop — mobile only, when the drawer is open */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity duration-200 ${
          isSidebarOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setIsSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar — off-canvas drawer below lg, static column at lg+ */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-[264px] max-w-[82vw] transform transition-transform duration-200 ease-out lg:static lg:z-auto lg:row-span-2 lg:w-auto lg:max-w-none lg:translate-x-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar role={user?.role} onNavigate={() => setIsSidebarOpen(false)} />
      </div>

      <TopBar
        onOpenPalette={() => setIsPaletteOpen(true)}
        onToggleSidebar={() => setIsSidebarOpen((o) => !o)}
      />

      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-surface p-4 sm:p-6 lg:rounded-tl-card lg:p-8">
        <Outlet />
      </main>

      <CommandPalette isOpen={isPaletteOpen} onClose={(shouldClose) => setIsPaletteOpen(!shouldClose)} />
    </div>
  );
}
