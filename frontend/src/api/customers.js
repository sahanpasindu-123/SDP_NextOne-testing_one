import axiosClient from "./axiosClient";

export const customersAPI = {
  // ===============================
  // Customer portal (self-service)
  // ===============================
  getMe: async () => {
    const res = await axiosClient.get("/customer/me");
    return res.data;
  },

  updateMe: async (payload) => {
    const res = await axiosClient.patch("/customer/me", payload);
    return res.data;
  },

  changeMyPassword: async (payload) => {
    const res = await axiosClient.post("/customer/change-password", payload);
    return res.data;
  },

  // Required by Admin User Management page
  // Must call axiosClient.get("/customers") and return res.data
  getAll: async () => {
    const res = await axiosClient.get("/customers");
    return res.data;
  },

  // Existing methods kept (to avoid breaking other usage)
  getCustomers: async () => {
    console.log("🔍 [API] GET /customers - Fetching customers");
    try {
      const response = await axiosClient.get("/customers");
      console.log("✅ [API] GET /customers - Success:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ [API] GET /customers - Error:", error);
      throw error;
    }
  },

  createCustomer: async (customerData) => {
    console.log("🔍 [API] POST /customers - Creating customer:", customerData);
    try {
      const response = await axiosClient.post("/customers", customerData);
      console.log("✅ [API] POST /customers - Success:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ [API] POST /customers - Error:", error);
      throw error;
    }
  },

  updateCustomer: async (id, customerData) => {
    console.log(
      "🔍 [API] PUT /customers - Updating customer:",
      id,
      customerData
    );
    try {
      const response = await axiosClient.put(`/customers/${id}`, customerData);
      console.log("✅ [API] PUT /customers - Success:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ [API] PUT /customers - Error:", error);
      throw error;
    }
  },

  deleteCustomer: async (id) => {
    console.log("🔍 [API] DELETE /customers - Deleting customer:", id);
    try {
      const response = await axiosClient.delete(`/customers/${id}`);
      console.log("✅ [API] DELETE /customers - Success:", response.data);
      return response.data;
    } catch (error) {
      console.error("❌ [API] DELETE /customers - Error:", error);
      throw error;
    }
  },
};
