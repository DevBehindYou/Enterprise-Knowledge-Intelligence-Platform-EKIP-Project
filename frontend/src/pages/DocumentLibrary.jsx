import { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { useDocumentLibraryViewModel } from '../viewmodels/useDocumentLibraryViewModel.js';
import DocumentCard from '../components/composite/DocumentCard.jsx';
import Skeleton from '../components/foundations/Skeleton.jsx';

export default function DocumentLibrary() {
  const { documents, searchResults, isLoading, search } = useDocumentLibraryViewModel();
  const [query, setQuery] = useState('');

  const displayItems = searchResults
    ? searchResults.map((r) => r.document).filter(Boolean)
    : documents;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Document library</h1>
        <p className="text-ink-muted text-[13.5px] mt-1.5">Semantic search across every document you're permitted to see.</p>
      </div>

      <div className="flex gap-2.5 mb-5">
        <div className="flex-1 flex items-center gap-2.5 bg-surface-raised border border-line rounded-component px-3.5 py-2.5">
          <Search size={16} className="text-ink-muted" />
          <input
            className="flex-1 bg-transparent outline-none text-[13.5px]"
            placeholder="How many vacation days do employees get?"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search(query)}
          />
          <span className="badge-accent badge">Semantic</span>
        </div>
        <button className="btn-secondary">
          <Filter size={16} /> Department
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-36 w-full rounded-component" />
          ))}
        </div>
      ) : displayItems.length === 0 ? (
        <div className="border border-dashed border-line rounded-component p-10 text-center text-ink-muted text-sm">
          No documents yet — ask your admin to upload your team's policies.
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4">
          {displayItems.map((doc) => (
            <DocumentCard key={doc._id} document={doc} />
          ))}
        </div>
      )}
    </div>
  );
}
