import { apiClient } from '../lib/apiClient.js';

export const chatService = {
  async ask(question, conversationId) {
    const { data } = await apiClient.post('/chat/ask', { question, conversationId });
    return data;
  },

  async submitFeedback(messageId, rating) {
    const { data } = await apiClient.post(`/chat/messages/${messageId}/feedback`, { rating });
    return data;
  },

  async listConversations(page = 1) {
    const { data } = await apiClient.get('/chat/conversations', { params: { page } });
    return data;
  },

  async getConversation(id) {
    const { data } = await apiClient.get(`/chat/conversations/${id}`);
    return data;
  },

  async updateConversation(id, updates) {
    const { data } = await apiClient.patch(`/chat/conversations/${id}`, updates);
    return data;
  },

  async deleteConversation(id) {
    await apiClient.delete(`/chat/conversations/${id}`);
  },
};
