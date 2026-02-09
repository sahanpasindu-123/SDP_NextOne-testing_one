import axiosClient from "./axiosClient";

export const employeeReservationsAPI = {
  list: async (params = {}) => {
    // backend mounts: /api/employee-reservations/reservations
    const res = await axiosClient.get("/employee-reservations/reservations", { params });
    return res.data;
  },

  approve: async (id) => {
    const res = await axiosClient.patch(`/employee-reservations/reservations/${id}/approve`);
    return res.data;
  },

  reject: async (id) => {
    const res = await axiosClient.patch(`/employee-reservations/reservations/${id}/reject`);
    return res.data;
  },
};
