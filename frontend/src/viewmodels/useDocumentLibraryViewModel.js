import { useState, useEffect, useCallback } from 'react';
import { documentService } from '../services/documentService.js';

export function useDocumentLibraryViewModel() {
  const [documents, setDocuments] = useState([]);
  const [searchResults, setSearchResults] = useState(null); // null = not searching, show `documents` instead
  const [filters, setFilters] = useState({ department: null, securityLevel: null, tag: null });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { items } = await documentService.list(filters);
      setDocuments(items);
    } catch {
      setError('Could not load documents.');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const search = useCallback(async (query) => {
    if (!query.trim()) {
      setSearchResults(null);
      return;
    }
    setIsLoading(true);
    try {
      const { results } = await documentService.search(query);
      setSearchResults(results);
    } catch {
      setError('Search failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { documents, searchResults, filters, setFilters, isLoading, error, search, reload: load };
}
