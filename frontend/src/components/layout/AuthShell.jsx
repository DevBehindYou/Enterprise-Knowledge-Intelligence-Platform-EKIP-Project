import { Sparkles } from 'lucide-react';

export default function AuthShell({ children }) {
  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-6">
      <div className="w-full max-w-[400px] bg-surface rounded-card p-9">
        <div className="flex items-center gap-2.5 font-display font-bold text-xl mb-7">
          <span className="w-[30px] h-[30px] bg-accent rounded-lg flex items-center justify-center text-white">
            <Sparkles size={16} />
          </span>
          EKIP
        </div>
        {children}
      </div>
    </div>
  );
}
