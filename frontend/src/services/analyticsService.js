import { apiClient } from '../lib/apiClient.js';

export const analyticsService = {
  async department(params = {}) {
    const { data } = await apiClient.get('/analytics/department', { params });
    return data;
  },
  async evaluation() {
    const { data } = await apiClient.get('/analytics/evaluation');
    return data;
  },
  async markEvaluationReviewed(feedbackEventId, notes) {
    const { data } = await apiClient.patch(`/analytics/evaluation/${feedbackEventId}`, { notes });
    return data;
  },
};
