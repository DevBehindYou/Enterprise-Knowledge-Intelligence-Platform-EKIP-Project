export default function Input({ label, error, hint, className = '', ...props }) {
  return (
    <div className="mb-4">
      {label && <label className="block text-[12.5px] font-semibold mb-1.5">{label}</label>}
      <input className={`input ${error ? 'input-error' : ''} ${className}`} {...props} />
      {error && <div className="text-danger text-xs mt-1.5">{error}</div>}
      {!error && hint && <div className="text-ink-muted text-xs mt-1.5">{hint}</div>}
    </div>
  );
}
