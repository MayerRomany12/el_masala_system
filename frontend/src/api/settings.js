import { apiClient } from './client';

export const settingsApi = {
  // GET /settings — Fetch dynamic system settings
  getSettings: async () => {
    const response = await apiClient.get('/settings');
    return response.data;
  },

  // PUT /settings — Update dynamic system settings (Super Admin)
  updateSettings: async (settingsData) => {
    const response = await apiClient.put('/settings', settingsData);
    return response.data;
  }
};
