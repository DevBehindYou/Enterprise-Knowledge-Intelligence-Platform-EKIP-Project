const VARIANTS = {
  primary: 'btn-primary',
  secondary: 'btn-secondary',
  ghost: 'btn-ghost',
  danger: 'btn-danger',
};

export default function Button({ variant = 'primary', size, loading, children, className = '', ...props }) {
  const sizeClass = size === 'sm' ? 'text-xs px-3 py-1.5' : '';
  return (
    <button className={`${VARIANTS[variant]} ${sizeClass} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading ? 'Please wait…' : children}
    </button>
  );
}
