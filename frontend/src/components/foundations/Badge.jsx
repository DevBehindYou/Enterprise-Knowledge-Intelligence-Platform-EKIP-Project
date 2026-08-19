const VARIANT_CLASS = {
  neutral: '',
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  accent: 'badge-accent',
  dark: 'badge-dark',
};

export default function Badge({ variant = 'neutral', children }) {
  return <span className={`badge ${VARIANT_CLASS[variant]}`}>{children}</span>;
}
