import { useEffect } from 'react';

export default function Toast({ message, variant = 'success', onDismiss, durationMs = 4000 }) {
  useEffect(() => {
    if (variant === 'error') return; // errors stay until manually dismissed
    const t = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(t);
  }, [variant, onDismiss, durationMs]);

  const dotColor = variant === 'error' ? 'bg-danger' : variant === 'info' ? 'bg-accent' : 'bg-success';

  return (
    <div className="fixed bottom-6 right-6 bg-ink text-white px-4 py-3 rounded-component text-[13px] flex items-center gap-2.5 shadow-2xl z-[60]">
      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
      {message}
    </div>
  );
}
