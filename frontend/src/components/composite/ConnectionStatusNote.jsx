import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

/**
 * Result of a "Test connection" round-trip. Shows the provider's own reason on
 * failure rather than a generic "invalid credentials" — a wrong region and a
 * wrong secret key need different fixes.
 */
export default function ConnectionStatusNote({ result, isTesting }) {
  if (isTesting) {
    return (
      <div className="flex items-center gap-2 text-[12.5px] text-ink-muted mb-3">
        <Loader2 size={14} className="animate-spin" />
        Testing the connection…
      </div>
    );
  }
  if (!result) return null;

  const Icon = result.ok ? CheckCircle2 : AlertCircle;
  return (
    <div
      className={`flex items-start gap-2 text-[12.5px] mb-3 p-3 rounded-component ${
        result.ok ? 'bg-success-tint text-[#146C48]' : 'bg-danger-tint text-[#B3282C]'
      }`}
    >
      <Icon size={14} className="mt-px shrink-0" />
      <span>{result.message}</span>
    </div>
  );
}
