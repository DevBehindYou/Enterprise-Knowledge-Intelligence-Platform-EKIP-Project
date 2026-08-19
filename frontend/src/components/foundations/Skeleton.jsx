export default function Skeleton({ className = 'h-4 w-full' }) {
  return (
    <div
      className={`rounded ${className}`}
      style={{
        background: 'linear-gradient(90deg, #D8D8D4 25%, #e3e3df 37%, #D8D8D4 63%)',
        backgroundSize: '400% 100%',
        animation: 'ekip-skeleton 1.4s ease infinite',
      }}
    >
      <style>{`@keyframes ekip-skeleton { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }`}</style>
    </div>
  );
}
