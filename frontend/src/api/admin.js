import axiosClient from "./axiosClient";

export const changeAdminPassword = (payload) =>
  axiosClient.post("/admin/change-password", payload);

// ===============================
// Admin Contacts (Inbox + Reply)
// ===============================
export const adminContactsAPI = {
  list: () => axiosClient.get("/admin/contacts"),
  getById: (id) => axiosClient.get(`/admin/contacts/${id}`),
  reply: (id, payload) => axiosClient.post(`/admin/contacts/${id}/reply`, payload),
};
