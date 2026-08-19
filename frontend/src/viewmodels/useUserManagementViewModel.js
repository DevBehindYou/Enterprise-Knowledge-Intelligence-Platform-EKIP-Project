import { useState, useEffect, useCallback } from 'react';
import { adminService } from '../services/adminService.js';

export function useUserManagementViewModel() {
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ role: null, department: null, status: null });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const { items } = await adminService.listUsers(filters);
      setUsers(items);
    } catch {
      setError('Could not load users.');
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  const invite = useCallback(async (payload) => {
    const created = await adminService.inviteUser(payload);
    setUsers((prev) => [created, ...prev]);
  }, []);

  const update = useCallback(async (id, updates) => {
    const updated = await adminService.updateUser(id, updates);
    setUsers((prev) => prev.map((u) => (u._id === id ? updated : u)));
  }, []);

  const suspend = useCallback(async (id) => {
    const updated = await adminService.suspendUser(id);
    setUsers((prev) => prev.map((u) => (u._id === id ? updated : u)));
  }, []);

  return { users, filters, setFilters, isLoading, error, invite, update, suspend, reload: load };
}
