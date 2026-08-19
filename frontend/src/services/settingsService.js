import { apiClient } from '../lib/apiClient.js';

/**
 * Settings → Storage Integration and AI Integration.
 * Secrets come back from the API pre-masked (`••••abcd`); posting a mask back
 * unchanged is how the backend knows to keep the stored value.
 */
export const settingsService = {
  // ---- Storage ----
  async getStorageProviders() {
    const { data } = await apiClient.get('/settings/storage/providers');
    return data.providers;
  },
  async listStorageConfigs() {
    const { data } = await apiClient.get('/settings/storage');
    return data.items;
  },
  async createStorageConfig(payload) {
    const { data } = await apiClient.post('/settings/storage', payload);
    return data;
  },
  async updateStorageConfig(id, payload) {
    const { data } = await apiClient.patch(`/settings/storage/${id}`, payload);
    return data;
  },
  async testStorageConfig(idOrPayload) {
    if (typeof idOrPayload === 'string') {
      const { data } = await apiClient.post(`/settings/storage/${idOrPayload}/test`);
      return data;
    }
    const { data } = await apiClient.post('/settings/storage/test', idOrPayload);
    return data;
  },
  async activateStorageConfig(id) {
    const { data } = await apiClient.post(`/settings/storage/${id}/activate`);
    return data;
  },
  async deleteStorageConfig(id) {
    await apiClient.delete(`/settings/storage/${id}`);
  },

  // ---- AI ----
  async getAiProviders() {
    const { data } = await apiClient.get('/settings/ai/providers');
    return data.providers;
  },
  async listAiConfigs() {
    const { data } = await apiClient.get('/settings/ai');
    return data.items;
  },
  async createAiConfig(payload) {
    const { data } = await apiClient.post('/settings/ai', payload);
    return data;
  },
  async updateAiConfig(id, payload) {
    const { data } = await apiClient.patch(`/settings/ai/${id}`, payload);
    return data;
  },
  async testAiConfig(idOrPayload) {
    if (typeof idOrPayload === 'string') {
      const { data } = await apiClient.post(`/settings/ai/${idOrPayload}/test`);
      return data;
    }
    const { data } = await apiClient.post('/settings/ai/test', idOrPayload);
    return data;
  },
  async setDefaultAiConfig(id) {
    const { data } = await apiClient.post(`/settings/ai/${id}/default`);
    return data;
  },
  async deleteAiConfig(id) {
    await apiClient.delete(`/settings/ai/${id}`);
  },
};
