import { apiClient } from './client';

export const birthdaysApi = {
  // GET /birthdays — Query birthdays by period, stage, gift_status
  getBirthdays: async (params = {}) => {
    const response = await apiClient.get('/birthdays', { params });
    return response.data;
  },

  // POST /birthdays/deliver-gift — Deliver gift for current calendar year
  deliverGift: async (giftData) => {
    const response = await apiClient.post('/birthdays/deliver-gift', giftData);
    return response.data;
  },

  // GET /birthdays/members/{id}/history — Past gift delivery history
  getMemberGiftHistory: async (memberId) => {
    const response = await apiClient.get(`/birthdays/members/${memberId}/history`);
    return response.data;
  }
};
