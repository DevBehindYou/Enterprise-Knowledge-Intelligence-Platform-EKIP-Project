import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useUserManagementViewModel } from '../../viewmodels/useUserManagementViewModel.js';
import Table from '../../components/foundations/Table.jsx';
import Button from '../../components/foundations/Button.jsx';
import Modal from '../../components/foundations/Modal.jsx';
import Input from '../../components/foundations/Input.jsx';
import Select from '../../components/foundations/Select.jsx';
import RoleBadge from '../../components/composite/RoleBadge.jsx';
import Badge from '../../components/foundations/Badge.jsx';

const STATUS_VARIANT = { active: 'success', invited: 'warning', suspended: 'danger' };

export default function AdminUsers() {
  const { users, isLoading, invite, update } = useUserManagementViewModel();
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({ name: '', email: '', role: 'employee', department: 'HR' });

  async function submitInvite(e) {
    e.preventDefault();
    await invite(inviteForm);
    setIsInviteOpen(false);
    setInviteForm({ name: '', email: '', role: 'employee', department: 'HR' });
  }

  const columns = [
    {
      key: 'name',
      label: 'User',
      render: (row) => (
        <div>
          <div className="font-semibold">{row.name}</div>
          <div className="text-ink-muted text-[11.5px]">{row.email}</div>
        </div>
      ),
    },
    { key: 'role', label: 'Role', render: (row) => <RoleBadge role={row.role} /> },
    { key: 'department', label: 'Department' },
    { key: 'status', label: 'Status', render: (row) => <Badge variant={STATUS_VARIANT[row.status]}>{row.status}</Badge> },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <div className="text-right">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const nextRole = window.prompt('New role (employee/manager/admin)', row.role);
              if (nextRole) update(row._id, { role: nextRole });
            }}
          >
            Edit
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">User management</h1>
          <p className="text-ink-muted text-[13.5px] mt-1.5">{users.length} users loaded.</p>
        </div>
        <Button onClick={() => setIsInviteOpen(true)}>
          <Plus size={16} /> Invite user
        </Button>
      </div>

      <div className="card !p-0 overflow-hidden">
        {isLoading ? <div className="p-6 text-ink-muted text-sm">Loading…</div> : <Table columns={columns} rows={users} />}
      </div>

      <Modal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} title="Invite a user">
        <form onSubmit={submitInvite}>
          <Input label="Full name" value={inviteForm.name} onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })} required />
          <Input label="Work email" type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} required />
          <Select
            label="Role"
            value={inviteForm.role}
            onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
            options={['employee', 'manager', 'admin']}
          />
          <Select
            label="Department"
            value={inviteForm.department}
            onChange={(e) => setInviteForm({ ...inviteForm, department: e.target.value })}
            options={['HR', 'Finance', 'Engineering', 'Legal', 'IT']}
          />
          <div className="flex gap-2.5 justify-end mt-2">
            <Button type="button" variant="secondary" onClick={() => setIsInviteOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Send invite</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
