import axiosClient from "./axiosClient";

export const productRequestsAPI = {
  createRequest: async (formData) => {
    const res = await axiosClient.post("/product-requests", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  list: async (status = "PENDING") => {
    const res = await axiosClient.get(`/product-requests?status=${status}`);
    return res.data;
  },

  approve: async (id) => {
    const res = await axiosClient.patch(`/product-requests/${id}/approve`);
    return res.data;
  },

  reject: async (id) => {
    const res = await axiosClient.patch(`/product-requests/${id}/reject`);
    return res.data;
  },
};
