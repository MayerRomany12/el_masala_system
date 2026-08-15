import { apiClient } from './client';

export const cardsApi = {
  // GET /members/{id}/card — Fetch member card data and get/create QR token
  getCardData: async (memberId) => {
    const response = await apiClient.get(`/members/${memberId}/card`);
    return response.data;
  },

  // POST /members/scan — Submit QR token from scanner and retrieve member profile
  scanQRToken: async (token) => {
    const response = await apiClient.post('/members/scan', { token });
    return response.data;
  }
};
