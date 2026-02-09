import axiosClient from "./axiosClient";

// Inventory module = Products endpoints.
// This file provides a stable, reusable API surface for the Admin Inventory UI.

export const inventoryAPI = {
  /**
   * GET /products
   * @param {{ q?: string, categoryId?: number|string, placeId?: number|string }} params
   */
  list: async (params = {}) => {
    const res = await axiosClient.get("/products", { params });
    return res.data; // { success, data }
  },

  /** GET /products/:id */
  getById: async (id) => {
    const res = await axiosClient.get(`/products/${id}`);
    return res.data;
  },

  /**
   * POST /products (ADMIN)
   * backend expects multipart/form-data
   */
  create: async (formData) => {
    const res = await axiosClient.post("/products", formData);
    return res.data;
  },

  /** PUT /products/:id (ADMIN) */
  update: async (id, payload) => {
    const res = await axiosClient.put(`/products/${id}`, payload);
    return res.data;
  },

  /** DELETE /products/:id (ADMIN) */
  remove: async (id) => {
    const res = await axiosClient.delete(`/products/${id}`);
    return res.data;
  },

  /** POST /products/:id/image (ADMIN) */
  updateImage: async (id, file) => {
    const fd = new FormData();
    fd.append("image", file);
    const res = await axiosClient.post(`/products/${id}/image`, fd);
    return res.data;
  },
};

export default inventoryAPI;
