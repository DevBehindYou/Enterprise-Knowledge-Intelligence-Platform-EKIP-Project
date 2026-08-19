import { apiClient } from '../lib/apiClient.js';

export const documentService = {
  async list(params = {}) {
    const { data } = await apiClient.get('/documents', { params });
    return data;
  },

  async search(q) {
    const { data } = await apiClient.get('/documents/search', { params: { q } });
    return data;
  },

  async getOne(id) {
    const { data } = await apiClient.get(`/documents/${id}`);
    return data;
  },

  async getStatus(id) {
    const { data } = await apiClient.get(`/documents/${id}/status`);
    return data;
  },

  async summarize(id) {
    const { data } = await apiClient.post(`/documents/${id}/summarize`);
    return data;
  },

  /**
   * Downloads the original file through the authenticated endpoint. A plain
   * `<a href={storageUrl}>` never worked (storageUrl is a server filesystem
   * path, not a URL) and — more importantly — bypassed the permission check
   * this route re-runs on every request. Fetches as a blob so the Authorization
   * header goes along, then triggers the save via a temporary object URL.
   */
  async downloadFile(id, filename) {
    const response = await apiClient.get(`/documents/${id}/file`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // ---- Admin-only ----
  async upload(formData, onUploadProgress) {
    const { data } = await apiClient.post('/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    });
    return data;
  },

  async reprocess(id) {
    const { data } = await apiClient.post(`/documents/${id}/reprocess`);
    return data;
  },

  async remove(id) {
    await apiClient.delete(`/documents/${id}`);
  },

  async listPermissions(id) {
    const { data } = await apiClient.get(`/documents/${id}/permissions`);
    return data;
  },

  async grantPermission(id, grant) {
    const { data } = await apiClient.post(`/documents/${id}/permissions`, grant);
    return data;
  },

  async revokePermission(id, permissionId) {
    await apiClient.delete(`/documents/${id}/permissions/${permissionId}`);
  },
};
