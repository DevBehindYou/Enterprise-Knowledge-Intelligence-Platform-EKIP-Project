// Model-layer service: thin wrappers around API calls. No React, no state — see docs/02 §2.
import { apiClient, setAccessToken } from '../lib/apiClient.js';

export const authService = {
  async login(email, password) {
    const { data } = await apiClient.post('/auth/login', { email, password });
    setAccessToken(data.accessToken);
    return data.user;
  },

  async signup({ name, email, password, department }) {
    const { data } = await apiClient.post('/auth/signup', { name, email, password, department });
    return data;
  },

  async refresh() {
    const { data } = await apiClient.post('/auth/refresh');
    setAccessToken(data.accessToken);
    return data.accessToken;
  },

  async logout() {
    await apiClient.post('/auth/logout');
    setAccessToken(null);
  },

  async forgotPassword(email) {
    const { data } = await apiClient.post('/auth/forgot-password', { email });
    return data;
  },

  async getCurrentUser() {
    const { data } = await apiClient.get('/auth/me');
    return data.user;
  },

  async updateProfile({ name, notificationPreferences }) {
    const { data } = await apiClient.patch('/auth/me', { name, notificationPreferences });
    return data.user;
  },

  async changePassword({ currentPassword, newPassword }) {
    const { data } = await apiClient.post('/auth/change-password', { currentPassword, newPassword });
    return data;
  },

  async logoutEverywhere() {
    const { data } = await apiClient.post('/auth/logout-all');
    setAccessToken(null);
    return data;
  },
};
