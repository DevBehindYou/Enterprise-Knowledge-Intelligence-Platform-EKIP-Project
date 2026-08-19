import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ConfidenceMeter from '../../src/components/composite/ConfidenceMeter.jsx';

describe('ConfidenceMeter', () => {
  it('labels a high score correctly', () => {
    render(<ConfidenceMeter score={0.91} />);
    expect(screen.getByText(/High/)).toBeInTheDocument();
    expect(screen.getByText(/0\.91/)).toBeInTheDocument();
  });

  it('labels a medium score correctly', () => {
    render(<ConfidenceMeter score={0.6} />);
    expect(screen.getByText(/Medium/)).toBeInTheDocument();
  });

  it('labels a low score correctly', () => {
    render(<ConfidenceMeter score={0.2} />);
    expect(screen.getByText(/Low/)).toBeInTheDocument();
  });

  it('fills the bar proportionally to the score', () => {
    const { container } = render(<ConfidenceMeter score={0.5} />);
    const fill = container.querySelector('.bg-warning');
    expect(fill).toHaveStyle({ width: '50%' });
  });
});
