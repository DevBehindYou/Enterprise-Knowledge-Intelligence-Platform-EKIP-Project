import { Sparkles } from 'lucide-react';
import BackendStatusBanner from '../composite/BackendStatusBanner.jsx';

export default function AuthShell({ children }) {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
      <div className="w-full max-w-[420px] bg-surface rounded-card p-8 border border-line shadow-2xl relative overflow-hidden">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5 font-display font-bold text-xl text-ink">
            <span className="w-[32px] h-[32px] bg-accent rounded-lg flex items-center justify-center text-white shadow-md">
              <Sparkles size={17} />
            </span>
            EKIP
          </div>
        </div>

        <BackendStatusBanner className="mb-5" />

        {children}
      </div>
    </div>
  );
}
