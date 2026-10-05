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
  },

  uploadPhoto: async (memberId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`/members/${memberId}/photo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  updatePhotoData: async (memberId, photoData) => {
    const response = await apiClient.put(`/members/${memberId}/photo-data`, { photo_data: photoData });
    return response.data;
  },

  getMemberAttendanceHistory: async (memberId) => {
    const response = await apiClient.get(`/members/${memberId}/attendance-history`);
    return response.data;
  },

  getDistinctAreas: async () => {
    const response = await apiClient.get('/members/areas/list');
    return response.data;
  },

  addArea: async (name) => {
    const response = await apiClient.post('/members/areas', { name });
    return response.data;
  },

  deleteArea: async (name) => {
    const response = await apiClient.delete(`/members/areas/${encodeURIComponent(name)}`);
    return response.data;
  }
};

