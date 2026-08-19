import { useState, useEffect, useCallback } from 'react';
import { documentService } from '../services/documentService.js';

export function usePermissionsViewModel(documentId) {
  const [grants, setGrants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!documentId) return;
    setIsLoading(true);
    try {
      const { items } = await documentService.listPermissions(documentId);
      setGrants(items);
    } catch {
      setError('Could not load permissions.');
    } finally {
      setIsLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    load();
  }, [load]);

  const grant = useCallback(
    async (payload) => {
      const created = await documentService.grantPermission(documentId, payload);
      setGrants((prev) => [...prev, created]);
    },
    [documentId]
  );

  const revoke = useCallback(
    async (permissionId) => {
      await documentService.revokePermission(documentId, permissionId);
      setGrants((prev) => prev.filter((g) => g._id !== permissionId));
    },
    [documentId]
  );

  return { grants, isLoading, error, grant, revoke, reload: load };
}
