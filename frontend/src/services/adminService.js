import { apiClient } from '../lib/apiClient.js';

export const adminService = {
  async listUsers(params = {}) {
    const { data } = await apiClient.get('/users', { params });
    return data;
  },
  async inviteUser(payload) {
    const { data } = await apiClient.post('/users/invite', payload);
    return data;
  },
  async updateUser(id, updates) {
    const { data } = await apiClient.patch(`/users/${id}`, updates);
    return data;
  },
  async suspendUser(id) {
    const { data } = await apiClient.delete(`/users/${id}`);
    return data;
  },
  async listAuditLog(params = {}) {
    const { data } = await apiClient.get('/audit', { params });
    return data;
  },
  async getIngestionQueue() {
    const { data } = await apiClient.get('/ingestion/queue');
    return data;
  },
};
