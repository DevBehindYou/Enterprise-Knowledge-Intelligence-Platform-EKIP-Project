import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('../../src/context/AuthContext.jsx', () => ({
  useAuth: vi.fn(),
}));

const { useAuth } = await import('../../src/context/AuthContext.jsx');
const { default: RequireRole } = await import('../../src/routes/RequireRole.jsx');

function renderWithRole(role) {
  useAuth.mockReturnValue({ user: { role } });
  return render(
    <MemoryRouter initialEntries={['/admin/users']}>
      <Routes>
        <Route element={<RequireRole roles={['admin']} />}>
          <Route path="/admin/users" element={<div>Admin Users Page</div>} />
        </Route>
        <Route path="/error/403" element={<div>403 Forbidden Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('RequireRole', () => {
  it('renders the protected route content when the role is allowed', () => {
    renderWithRole('admin');
    expect(screen.getByText('Admin Users Page')).toBeInTheDocument();
  });

  it('redirects to the 403 page when the role is not allowed', () => {
    renderWithRole('employee');
    expect(screen.getByText('403 Forbidden Page')).toBeInTheDocument();
    expect(screen.queryByText('Admin Users Page')).not.toBeInTheDocument();
  });

  it('redirects a manager away from an admin-only route', () => {
    renderWithRole('manager');
    expect(screen.getByText('403 Forbidden Page')).toBeInTheDocument();
  });
});
