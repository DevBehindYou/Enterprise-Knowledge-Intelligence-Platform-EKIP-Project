import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PermissionMatrixCell from '../../src/components/composite/PermissionMatrixCell.jsx';

describe('PermissionMatrixCell', () => {
  it('renders the "—" label for "none" access', () => {
    render(<PermissionMatrixCell accessLevel="none" onChange={() => {}} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders "View" for "view" access and "View + Cite" for "cite"', () => {
    const { rerender } = render(<PermissionMatrixCell accessLevel="view" onChange={() => {}} />);
    expect(screen.getByText('View')).toBeInTheDocument();
    rerender(<PermissionMatrixCell accessLevel="cite" onChange={() => {}} />);
    expect(screen.getByText('View + Cite')).toBeInTheDocument();
  });

  it('cycles none -> view -> cite -> none on each click', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PermissionMatrixCell accessLevel="none" onChange={onChange} />);
    await user.click(screen.getByRole('button'));
    expect(onChange).toHaveBeenCalledWith('view');
  });

  it('shows the override indicator dot only when isOverride is true', () => {
    const { container, rerender } = render(<PermissionMatrixCell accessLevel="view" onChange={() => {}} isOverride={false} />);
    expect(container.querySelector('.bg-warning')).not.toBeInTheDocument();
    rerender(<PermissionMatrixCell accessLevel="view" onChange={() => {}} isOverride />);
    expect(container.querySelector('.bg-warning')).toBeInTheDocument();
  });
});
