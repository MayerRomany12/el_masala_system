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

  // Export URLs for direct file download or HTML print preview
  getExportUrl: (reportType, format, params = {}) => {
    const query = new URLSearchParams({
      report_type: reportType,
      ...params
    }).toString();
    return `/api/v1/reports/export/${format}?${query}`;
  }
};
