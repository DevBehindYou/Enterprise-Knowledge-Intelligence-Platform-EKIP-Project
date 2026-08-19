import Badge from '../foundations/Badge.jsx';

const ROLE_VARIANT = { employee: 'neutral', manager: 'accent', admin: 'dark' };
const ROLE_LABEL = { employee: 'Employee', manager: 'Manager', admin: 'Admin' };

export default function RoleBadge({ role }) {
  return <Badge variant={ROLE_VARIANT[role]}>{ROLE_LABEL[role]}</Badge>;
}
