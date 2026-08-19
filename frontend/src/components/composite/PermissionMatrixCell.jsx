const CYCLE = ['none', 'view', 'cite'];
const LABEL = { none: '—', view: 'View', cite: 'View + Cite' };
const CLASS = {
  none: 'text-ink-muted',
  view: 'bg-accent-tint text-accent-dim font-semibold',
  cite: 'bg-accent text-white font-semibold',
};

export default function PermissionMatrixCell({ accessLevel, onChange, isOverride }) {
  function handleClick() {
    const next = CYCLE[(CYCLE.indexOf(accessLevel) + 1) % CYCLE.length];
    onChange(next);
  }

  return (
    <button
      onClick={handleClick}
      className={`relative flex items-center justify-center p-2.5 text-xs border-r border-b border-line ${CLASS[accessLevel]}`}
    >
      {LABEL[accessLevel]}
      {isOverride && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-warning" />}
    </button>
  );
}
