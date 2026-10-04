import { apiClient } from './client';

export const reportsApi = {
  // GET /reports/attendance — Attendance analytics
  getAttendanceReport: async (params = {}) => {
    const response = await apiClient.get('/reports/attendance', { params });
    return response.data;
  },

  // GET /reports/financials — Financial event breakdown (6 metrics)
  getFinancialReport: async (params = {}) => {
    const response = await apiClient.get('/reports/financials', { params });
    return response.data;
  },

  // GET /reports/followup — Follow-up & absence performance
  getFollowupReport: async () => {
    const response = await apiClient.get('/reports/followup');
    return response.data;
  },

  // GET /reports/birthdays — Birthday gift delivery summary
  getBirthdayReport: async (params = {}) => {
    const response = await apiClient.get('/reports/birthdays', { params });
    return response.data;
  },

  // GET /reports/who-attended — Attended list
  getWhoAttendedReport: async (params = {}) => {
    const response = await apiClient.get('/reports/who-attended', { params });
    return response.data;
  },

  // GET /reports/who-absent — Absent list
  getWhoAbsentReport: async (params = {}) => {
    const response = await apiClient.get('/reports/who-absent', { params });
    return response.data;
  },

  // GET /reports/member/{id}/print-profile — Print member profile URL
  getMemberProfilePrintUrl: (memberId) => {
    return `${apiClient.defaults.baseURL || '/api/v1'}/reports/member/${memberId}/print-profile`;
  },

  // GET /reports/export/{format} — Authenticated Blob Download
  downloadExport: async (reportType, format, params = {}) => {
    const response = await apiClient.get(`/reports/export/${format}`, {
      params: { report_type: reportType, ...params },
      responseType: 'blob'
    });
    return response;
  }
};

export default reportsApi;
