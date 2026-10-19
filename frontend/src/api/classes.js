import { apiClient } from './client';

export const classesApi = {
  // GET /classes
  getClasses: async (params = {}) => {
    const response = await apiClient.get('/classes', { params });
    return response.data;
  },

  // GET /classes/{id}
  getClassDetails: async (classId) => {
    const response = await apiClient.get(`/classes/${classId}`);
    return response.data;
  },

  // POST /classes
  createClass: async (data) => {
    const response = await apiClient.post('/classes', data);
    return response.data;
  },

  // PUT /classes/{id}
  updateClass: async (classId, data) => {
    const response = await apiClient.put(`/classes/${classId}`, data);
    return response.data;
  },

  // DELETE /classes/{id}
  deleteClass: async (classId) => {
    const response = await apiClient.delete(`/classes/${classId}`);
    return response.data;
  },

  // POST /classes/promote-new-coptic-year — Cascade promotion & annual reset (Super Admin)
  promoteNewCopticYear: async () => {
    const response = await apiClient.post('/classes/promote-new-coptic-year');
    return response.data;
  }
};
