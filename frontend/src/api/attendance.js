import { apiClient } from './client';

export const attendanceApi = {
  // GET /attendance/devices
  getDevices: async () => {
    const response = await apiClient.get('/attendance/devices');
    return response.data;
  },

  // POST /attendance/devices — Register device
  registerDevice: async (deviceData) => {
    const response = await apiClient.post('/attendance/devices', deviceData);
    return response.data;
  },

  // GET /attendance/sessions — List sessions
  getSessions: async (params = {}) => {
    const response = await apiClient.get('/attendance/sessions', { params });
    return response.data;
  },

  // GET /attendance/sessions/{id} — Details and stats
  getSessionById: async (id) => {
    const response = await apiClient.get(`/attendance/sessions/${id}`);
    return response.data;
  },

  // POST /attendance/sessions — Create new open session
  createSession: async (sessionData) => {
    const response = await apiClient.post('/attendance/sessions', sessionData);
    return response.data;
  },

  // PATCH /attendance/sessions/{id}/status — Open or Close session
  updateSessionStatus: async (id, status) => {
    const response = await apiClient.patch(`/attendance/sessions/${id}/status`, null, { params: { status } });
    return response.data;
  },

  // PATCH /attendance/sessions/{id}/recurrence — Change frequency or stop recurrence (OneTime)
  updateSessionRecurrence: async (id, recurrence) => {
    const response = await apiClient.patch(`/attendance/sessions/${id}/recurrence`, { recurrence });
    return response.data;
  },

  // POST /attendance/scan — Unified Attendance Motor with Header X-Device-Token
  scanAttendance: async (scanData, deviceToken = null) => {
    const headers = {};
    const activeToken = deviceToken || localStorage.getItem('almasalla_device_token');
    if (activeToken) {
      headers['X-Device-Token'] = activeToken;
    }
    const response = await apiClient.post('/attendance/scan', scanData, { headers });
    return response.data;
  },

  // GET /attendance/sessions/{id}/records — Live feed
  getSessionRecords: async (sessionId, params = {}) => {
    const response = await apiClient.get(`/attendance/sessions/${sessionId}/records`, { params });
    return response.data;
  },

  // PATCH /attendance/records/{id}/cancel — Correct attendance with reason
  cancelRecord: async (recordId, cancellationReason) => {
    const response = await apiClient.patch(`/attendance/records/${recordId}/cancel`, { cancellation_reason: cancellationReason });
    return response.data;
  }
};
