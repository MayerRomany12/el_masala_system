import { apiClient } from './client';

export const followupApi = {
  // POST /followup/detect — Trigger auto absence detector with deduplication
  runDetector: async (stage = null) => {
    const response = await apiClient.post('/followup/detect', null, { params: { stage } });
    return response.data;
  },

  // GET /followup/tasks — List follow-up tasks with filters
  getTasks: async (params = {}) => {
    const response = await apiClient.get('/followup/tasks', { params });
    return response.data;
  },

  // GET /followup/tasks/{id} — Details and logs
  getTaskById: async (id) => {
    const response = await apiClient.get(`/followup/tasks/${id}`);
    return response.data;
  },

  // POST /followup/tasks — Manual task assignment
  createTask: async (taskData) => {
    const response = await apiClient.post('/followup/tasks', taskData);
    return response.data;
  },

  // PUT /followup/tasks/{id} — Update task (assign servant, status, priority)
  updateTask: async (id, taskData) => {
    const response = await apiClient.put(`/followup/tasks/${id}`, taskData);
    return response.data;
  },

  // POST /followup/tasks/{id}/log — Log follow-up visit/call
  logFollowup: async (id, logData) => {
    const response = await apiClient.post(`/followup/tasks/${id}/log`, logData);
    return response.data;
  },

  // GET /followup/tasks/{id}/logs — Get logs history
  getTaskLogs: async (id) => {
    const response = await apiClient.get(`/followup/tasks/${id}/logs`);
    return response.data;
  },

  // PATCH /followup/tasks/{id}/escalate — Escalate task
  escalateTask: async (id) => {
    const response = await apiClient.patch(`/followup/tasks/${id}/escalate`);
    return response.data;
  }
};
