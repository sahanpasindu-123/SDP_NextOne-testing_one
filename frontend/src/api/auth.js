import axiosClient from "./axiosClient";

export const authAPI = {
  // -----------------------------
  // Backwards-compatible login alias
  // (Prefer customerLogin() or staffLogin() in new code)
  // -----------------------------
  login: async (employeeId, password) => {
    const response = await axiosClient.post("/auth/login", { employeeId, password });
    const data = response.data;

    const token = data?.token || data?.data?.token;
    const role = String(data?.role || data?.data?.role || "").toUpperCase();

    return { ...data, token, role };
  },

  // -----------------------------
  // Staff login (ADMIN + EMPLOYEE)
  // payload examples:
  // { adminId: "ADM001", password: "123456" }
  // { employeeId: "EMP001", password: "123456" }
  // -----------------------------
  staffLogin: async (data) => {
    try {
      const response = await axiosClient.post("/auth/staff-login", data);
      const resData = response.data;

      const token = resData?.token || resData?.data?.token;
      const role = String(resData?.role || resData?.data?.role || "").toUpperCase();

      if (!token) {
        throw new Error("Login succeeded but token missing.");
      }

      // ✅ Role-based tokens (IMPORTANT)
      return { ...resData, token, role };
    } catch (error) {
      console.log("LOGIN ERROR:", error?.response?.data);
      throw error;
    }
  },

  // -----------------------------
  // Customer signup
  // -----------------------------
  customerSignup: async ({ name, email, contact, password }) => {
    const response = await axiosClient.post("/auth/customer-signup", {
      name,
      email,
      contact,
      password,
    });
    return response.data;
  },

  // -----------------------------
  // Customer login
  // -----------------------------
  customerLogin: async ({ email, password }) => {
    const response = await axiosClient.post("/auth/customer-login", {
      email,
      password,
    });

    const data = response.data;
    const token = data?.token || data?.data?.token;

    if (!token) {
      throw new Error("Login succeeded but token missing.");
    }

    // ✅ customer token key
    return { ...data, token, role: "CUSTOMER" };
  },

  // -----------------------------
  // Email verification
  // -----------------------------
  verifyEmail: async ({ email, code }) => {
    const response = await axiosClient.post("/auth/verify-email", {
      email,
      code,
    });

    const data = response.data;
    const token = data?.token || data?.data?.token;
    const role = String(data?.role || data?.data?.role || "").toUpperCase();

    return { ...data, token, role };
  },

  resendVerification: async ({ email }) => {
    const response = await axiosClient.post("/auth/resend-verification", { email });
    return response.data;
  },

  // -----------------------------
  // Forgot password flow
  // -----------------------------
  forgotPassword: async ({ email }) => {
    const response = await axiosClient.post("/auth/forgot-password", { email });
    return response.data;
  },

  verifyResetCode: async ({ email, code }) => {
    const response = await axiosClient.post("/auth/verify-code", { email, code });
    return response.data;
  },

  resetPassword: async ({ email, code, newPassword }) => {
    const response = await axiosClient.post("/auth/reset-password", {
      email,
      code,
      newPassword,
    });
    return response.data;
  },

  // -----------------------------
  // Get current user
  // -----------------------------
  me: async () => {
    const response = await axiosClient.get("/auth/me");
    return response.data;
  },
};
