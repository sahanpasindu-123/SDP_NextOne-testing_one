import axiosClient from './axiosClient'

export const reservationsAPI = {
  getReservations: async () => {
    const response = await axiosClient.get('/reservations')
    return response.data
  },

  getMyReservations: async () => {
    const response = await axiosClient.get("/reservations/my");
    return response.data;
  },

  /**
   * Create a reservation (customer)
   * @param {number} productId
   * @param {number} quantity
   * @param {string|Date|null} date optional ReservedAt
   */
  createReservation: async (productId, quantity, date = null, notes = null) => {
    const payload = {
      productId,
      quantity,
      ...(date ? { reservedAt: date } : {}),
      ...(notes ? { notes } : {}),
    };

    const response = await axiosClient.post("/reservations", payload);
    return response.data;
  },

  // Backwards compatibility (some components may still call this)
  createReservationRaw: async (reservationData) => {
    const response = await axiosClient.post("/reservations", reservationData);
    return response.data;
  },

  confirmReservation: async (id) => {
    const response = await axiosClient.put(`/reservations/${id}/confirm`);
    return response.data;
  },

  cancelReservation: async (id) => {
    const response = await axiosClient.patch(`/reservations/${id}/cancel`);
    return response.data;
  },

  // ADMIN helpers
  getAdminReservations: async () => {
    const response = await axiosClient.get("/reservations");
    return response.data;
  },

  adminApprove: async (id) => {
    const response = await axiosClient.patch(`/reservations/admin/${id}/approve`);
    return response.data;
  },

  adminReject: async (id) => {
    const response = await axiosClient.patch(`/reservations/admin/${id}/reject`);
    return response.data;
  },

  updateReservation: async (id, reservationData) => {
    const response = await axiosClient.put(`/reservations/${id}`, reservationData)
    return response.data
  },

  deleteReservation: async (id) => {
    const response = await axiosClient.delete(`/reservations/${id}`)
    return response.data
  }
}