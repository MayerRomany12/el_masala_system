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
  },

  // GET /seasons — List seasons
  getSeasons: async (params = {}) => {
    const response = await apiClient.get('/seasons', { params });
    return response.data;
  },

  // POST /seasons — Create new season
  createSeason: async (seasonData) => {
    const response = await apiClient.post('/seasons', seasonData);
    return response.data;
  },

  // PUT /seasons/{id} — Update season (e.g. set active)
  updateSeason: async (seasonId, seasonData) => {
    const response = await apiClient.put(`/seasons/${seasonId}`, seasonData);
    return response.data;
  }
};

