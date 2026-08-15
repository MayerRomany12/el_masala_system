import { apiClient } from './client';

export const eventsApi = {
  // GET /events — List events with filters
  getEvents: async (params = {}) => {
    const response = await apiClient.get('/events', { params });
    return response.data;
  },

  // GET /events/{id} — Get details and financial stats
  getEventById: async (id) => {
    const response = await apiClient.get(`/events/${id}`);
    return response.data;
  },

  // POST /events — Create new event/trip/meeting
  createEvent: async (eventData) => {
    const response = await apiClient.post('/events', eventData);
    return response.data;
  },

  // PUT /events/{id} — Update event details
  updateEvent: async (id, eventData) => {
    const response = await apiClient.put(`/events/${id}`, eventData);
    return response.data;
  },

  // PATCH /events/{id}/status — Update event status (Active, Completed, Cancelled)
  updateEventStatus: async (id, status) => {
    const response = await apiClient.patch(`/events/${id}/status`, null, { params: { status } });
    return response.data;
  },

  // POST /events/{id}/register — Register member to event
  registerMember: async (eventId, regData) => {
    const response = await apiClient.post(`/events/${eventId}/register`, regData);
    return response.data;
  },

  // GET /events/{id}/participants — Get list of participants & payments
  getParticipants: async (eventId, params = {}) => {
    const response = await apiClient.get(`/events/${eventId}/participants`, { params });
    return response.data;
  },

  // PATCH /events/{id}/participants/{regId}/payment — Update payment amount paid
  updatePayment: async (eventId, registrationId, paymentData) => {
    const response = await apiClient.patch(`/events/${eventId}/participants/${registrationId}/payment`, paymentData);
    return response.data;
  }
};
