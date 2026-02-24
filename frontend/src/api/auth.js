import axiosClient from "./axiosClient";

export const authAPI = {
  // -----------------------------
  // Backwards-compatible login alias
  // (Prefer customerLogin() or staffLogin() in new code)
  // -----------------------------
  login: async (email, password) => {
    const response = await axiosClient.post("/auth/login", { email, password });
    const data = response.data;

    const token = data?.token || data?.data?.token;
    const role = String(data?.role || data?.data?.role || "").toUpperCase();

    // Legacy keys (avoid breaking older code)
    if (token) {
      localStorage.setItem("token", token);
      localStorage.setItem("authToken", token);
    }

    // Role-aware keys (new)
    if (token && role) {
      if (role === "ADMIN") localStorage.setItem("adminToken", token);
      if (role === "EMPLOYEE") localStorage.setItem("employeeToken", token);
      if (role === "CUSTOMER") localStorage.setItem("customerToken", token);
      localStorage.setItem("role", role);
    }

    return { ...data, token, role };
  },

  // -----------------------------
  // Staff login (ADMIN + EMPLOYEE)
  // payload examples:
  // { adminId: "ADM001", password: "123456" }
  // { employeeId: "EMP001", password: "123456" }
  // -----------------------------
  staffLogin: async (payload) => {
    const response = await axiosClient.post("/auth/staff-login", payload);
    const data = response.data;

    const token = data?.token || data?.data?.token;
    const role = String(data?.role || data?.data?.role || "").toUpperCase();

    if (!token) {
      throw new Error("Login succeeded but token missing.");
    }

    // ✅ Role-based tokens (IMPORTANT)
    if (role === "ADMIN") localStorage.setItem("adminToken", token);
    else if (role === "EMPLOYEE") localStorage.setItem("employeeToken", token);
    else {
      // fallback if backend didn't send role correctly
      localStorage.setItem("authToken", token);
    }

    // Keep legacy keys for compatibility (optional)
    localStorage.setItem("token", token);
    localStorage.setItem("authToken", token);
    if (role) localStorage.setItem("role", role);

    return { ...data, token, role };
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
    localStorage.setItem("customerToken", token);

    // legacy keys (optional)
    localStorage.setItem("token", token);
    localStorage.setItem("authToken", token);
    localStorage.setItem("role", "CUSTOMER");

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

    if (token) {
      if (role === "ADMIN") localStorage.setItem("adminToken", token);
      else if (role === "EMPLOYEE") localStorage.setItem("employeeToken", token);
      else localStorage.setItem("customerToken", token);

      // legacy keys
      localStorage.setItem("token", token);
      localStorage.setItem("authToken", token);
      if (role) localStorage.setItem("role", role);
    }

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
