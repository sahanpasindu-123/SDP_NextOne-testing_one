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
    if (token) {
      localStorage.setItem("token", token);
      localStorage.setItem("authToken", token);
    }
    return { ...data, token };
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

    // normalize + store token if present
    const token = data?.token || data?.data?.token;
    if (token) {
      localStorage.setItem("token", token);
      localStorage.setItem("authToken", token);
    }

    return { ...data, token };
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
  // Backend returns: { success: true, token: "..." }
  // Some other endpoints might return: { data: { token: "..." } }
  // So we normalize both.
  // -----------------------------
  customerLogin: async ({ email, password }) => {
    const response = await axiosClient.post("/auth/customer-login", {
      email,
      password,
    });

    const data = response.data;

    // ✅ normalize token path
    const token = data?.token || data?.data?.token;

    if (!token) {
      // keep same message your UI expects
      throw new Error("Login succeeded but token missing.");
    }

    // ✅ store token for later requests
    localStorage.setItem("token", token);
    localStorage.setItem("authToken", token);

    // ✅ always return token at top-level too
    return { ...data, token };
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
    if (token) {
      localStorage.setItem("token", token);
      localStorage.setItem("authToken", token);
    }

    return { ...data, token };
  },

  resendVerification: async ({ email }) => {
    const response = await axiosClient.post("/auth/resend-verification", {
      email,
    });
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
