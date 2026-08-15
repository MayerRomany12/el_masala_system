import { apiClient } from './client';

export const rewardsApi = {
  // GET /rewards/members/{id}/points — Points balance & ledger
  getMemberPoints: async (memberId) => {
    const response = await apiClient.get(`/rewards/members/${memberId}/points`);
    return response.data;
  },

  // POST /rewards/award — Award bonus points
  awardPoints: async (awardData) => {
    const response = await apiClient.post('/rewards/award', awardData);
    return response.data;
  },

  // POST /rewards/redeem — Redeem points for trip discount
  redeemPoints: async (redeemData) => {
    const response = await apiClient.post('/rewards/redeem', redeemData);
    return response.data;
  },

  // GET /rewards/calculate-discount — Trip discount calculator
  calculateTripDiscount: async (memberId, eventId) => {
    const response = await apiClient.get('/rewards/calculate-discount', {
      params: { member_id: memberId, event_id: eventId }
    });
    return response.data;
  },

  // GET /rewards/leaderboard — Top attendance & points
  getLeaderboard: async (params = {}) => {
    const response = await apiClient.get('/rewards/leaderboard', { params });
    return response.data;
  }
};
