import axiosClient from "./axiosClient";

export const categoriesAPI = {
  getAll: async () => {
    console.log("🔍 [API] GET /categories - Fetching categories");
    try {
      // axiosClient baseURL already contains `/api`
      const res = await axiosClient.get("/categories");
      console.log("✅ [API] GET /categories - Success:", res.data);
      return res.data;
    } catch (error) {
      console.error("❌ [API] GET /categories - Error:", error);
      throw error;
    }
  },
  create: async (name) => {
    console.log("🔍 [API] POST /categories - Creating category:", name);
    try {
      const res = await axiosClient.post("/categories", { name });
      console.log("✅ [API] POST /categories - Success:", res.data);
      return res.data;
    } catch (error) {
      console.error("❌ [API] POST /categories - Error:", error);
      throw error;
    }
  },
  update: async (id, name) => {
    console.log("🔍 [API] PUT /categories - Updating category:", id, name);
    try {
      const res = await axiosClient.put(`/categories/${id}`, { name });
      console.log("✅ [API] PUT /categories - Success:", res.data);
      return res.data;
    } catch (error) {
      console.error("❌ [API] PUT /categories - Error:", error);
      throw error;
    }
  },
  remove: async (id) => {
    console.log("🔍 [API] DELETE /categories - Deleting category:", id);
    try {
      const res = await axiosClient.delete(`/categories/${id}`);
      console.log("✅ [API] DELETE /categories - Success:", res.data);
      return res.data;
    } catch (error) {
      console.error("❌ [API] DELETE /categories - Error:", error);
      throw error;
    }
  },

  // Optional helper (used by detail screens if needed)
  getById: async (id) => {
    console.log("🔍 [API] GET /categories/:id - Fetching category:", id);
    try {
      const res = await axiosClient.get(`/categories/${id}`);
      console.log("✅ [API] GET /categories/:id - Success:", res.data);
      return res.data;
    } catch (error) {
      console.error("❌ [API] GET /categories/:id - Error:", error);
      throw error;
    }
  },
};
