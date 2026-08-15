import { apiClient } from './client';

export const messagesApi = {
  // POST /messages — Send internal message / assign task
  sendMessage: async (messageData) => {
    const response = await apiClient.post('/messages', messageData);
    return response.data;
  },

  // GET /messages/inbox — Get inbox with per-user read tracking
  getInbox: async () => {
    const response = await apiClient.get('/messages/inbox');
    return response.data;
  },

  // GET /messages/sent — Get sent messages
  getSent: async () => {
    const response = await apiClient.get('/messages/sent');
    return response.data;
  },

  // PATCH /messages/{id}/read — Mark as read
  markAsRead: async (messageId) => {
    const response = await apiClient.patch(`/messages/${messageId}/read`);
    return response.data;
  },

  // PATCH /messages/{id}/status — Update task status (Pending, In_Progress, Completed)
  updateTaskStatus: async (messageId, status) => {
    const response = await apiClient.patch(`/messages/${messageId}/status`, { status });
    return response.data;
  },

  // GET /messages/unread-count — Unread badge counter for Navbar
  getUnreadCount: async () => {
    const response = await apiClient.get('/messages/unread-count');
    return response.data;
  }
};
