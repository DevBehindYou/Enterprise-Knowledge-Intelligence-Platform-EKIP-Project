import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const navigateMock = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}));

const { default: CitationChip } = await import('../../src/components/composite/CitationChip.jsx');

describe('CitationChip', () => {
  it('renders the document name and page number', () => {
    render(<CitationChip documentId="doc-1" documentName="Travel_Policy.pdf" page={4} chunkId="chunk-1" />);
    expect(screen.getByText('Travel_Policy.pdf')).toBeInTheDocument();
    expect(screen.getByText('Page 4')).toBeInTheDocument();
  });

  it('falls back to the section label when no page number is given', () => {
    render(<CitationChip documentId="doc-2" documentName="HR_Manual.docx" section="Benefits" chunkId="chunk-2" />);
    expect(screen.getByText('Benefits')).toBeInTheDocument();
  });

  it('navigates to the document, scoped to the cited chunk, when clicked', async () => {
    const user = userEvent.setup();
    render(<CitationChip documentId="doc-1" documentName="Travel_Policy.pdf" page={4} chunkId="chunk-1" />);

    await user.click(screen.getByRole('button'));

    expect(navigateMock).toHaveBeenCalledWith('/documents/doc-1?chunk=chunk-1');
  });
});
