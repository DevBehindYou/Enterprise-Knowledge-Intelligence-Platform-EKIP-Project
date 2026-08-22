export default function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }) {
  if (!isOpen) return null;
  return (
    <div
      className="fixed inset-0 bg-signal/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="presentation"
    >
      {/* max-h + overflow so a tall dialog (long forms) scrolls inside itself
          instead of overflowing off the top/bottom of the viewport on short
          screens; responsive padding keeps it comfortable on small phones. */}
      <div
        className={`bg-surface rounded-card p-5 sm:p-7 w-full ${maxWidth} max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {title && <h3 className="text-base font-semibold mb-4">{title}</h3>}
        {children}
      </div>
    </div>
  );
}
