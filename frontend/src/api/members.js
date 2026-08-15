import { apiClient } from './client';

export const membersApi = {
  getMembers: async (params = {}) => {
    const response = await apiClient.get('/members', { params });
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get('/members/stats');
    return response.data;
  },

  getMemberById: async (memberId) => {
    const response = await apiClient.get(`/members/${memberId}`);
    return response.data;
  },

  createMember: async (memberData) => {
    const response = await apiClient.post('/members', memberData);
    return response.data;
  },

  updateMember: async (memberId, memberData) => {
    const response = await apiClient.put(`/members/${memberId}`, memberData);
    return response.data;
  },

  updateStatus: async (memberId, status) => {
    const response = await apiClient.patch(`/members/${memberId}/status`, { status });
    return response.data;
  }
};
