import axiosClient from "./axiosClient";

export const alertsAPI = {
  list: async (params = {}) => {
    const res = await axiosClient.get("/alerts", { params });
    return res.data;
  },

  markAllRead: async () => {
    const res = await axiosClient.patch("/alerts/read-all");
    return res.data;
  },

  markRead: async (id) => {
    const res = await axiosClient.patch(`/alerts/${id}/read`);
    return res.data;
  },
};
