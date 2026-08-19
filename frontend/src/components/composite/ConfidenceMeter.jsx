function bandFor(score) {
  if (score >= 0.8) return { label: 'High', color: 'bg-accent' };
  if (score >= 0.5) return { label: 'Medium', color: 'bg-warning' };
  return { label: 'Low', color: 'bg-danger' };
}

export default function ConfidenceMeter({ score }) {
  const { label, color } = bandFor(score);
  return (
    <div className="flex items-center gap-2 mt-2.5">
      <div className="w-[120px] h-1.5 bg-line rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.round(score * 100)}%` }} />
      </div>
      <span className="font-mono text-[11.5px] text-ink-muted">
        {label} · {score.toFixed(2)}
      </span>
    </div>
  );
}
