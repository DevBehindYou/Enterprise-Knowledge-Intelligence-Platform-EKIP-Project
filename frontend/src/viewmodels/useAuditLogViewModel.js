import { useState, useEffect, useCallback } from 'react';
import { adminService } from '../services/adminService.js';

export function useAuditLogViewModel() {
  const [entries, setEntries] = useState([]);
  const [filters, setFilters] = useState({ actorId: null, targetType: null, action: null });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const { items } = await adminService.listAuditLog(filters);
      setEntries(items);
    } catch {
      setError('Could not load the audit log.');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  return { entries, filters, setFilters, isLoading, error, reload: load };
}
