import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const axiosClient = axios.create({ baseURL });

// ===============================
// Error normalization
// ===============================
export function normalizeAxiosError(error) {
  if (error && !error.response) {
    return {
      status: null,
      message:
        "Unable to reach the server. Please check your connection or try again later.",
      isNetworkError: true,
      raw: error,
    };
  }

  const status = error?.response?.status ?? null;
  const data = error?.response?.data;

  const message =
    (typeof data?.message === "string" && data.message) ||
    (typeof error?.message === "string" && error.message) ||
    "Request failed";

  const errors = Array.isArray(data?.errors) ? data.errors : undefined;

  return {
    status,
    message,
    errors,
    raw: error,
  };
}

// ===============================
// Helpers (AUTH)
// ===============================
function clearAuthStorage() {
  // legacy keys
  localStorage.removeItem("authToken");
  localStorage.removeItem("token");
  localStorage.removeItem("role");

  // ✅ role-based keys (IMPORTANT)
  localStorage.removeItem("adminToken");
  localStorage.removeItem("employeeToken");
  localStorage.removeItem("customerToken");

  // optional extras
  localStorage.removeItem("user");
  localStorage.removeItem("admin");
  localStorage.removeItem("employee");
}

function emitLogout(reason, details) {
  try {
    window.dispatchEvent(
      new CustomEvent("auth:logout", {
        detail: { reason, ...(details || {}) },
      })
    );
  } catch {
    // ignore
  }
}

// ===============================
// Token selection by portal path
// ===============================
function pickTokenByPortalPath() {
  const path = window.location?.pathname || "";

  if (path.startsWith("/admin")) {
    return localStorage.getItem("adminToken");
  }
  if (path.startsWith("/employee")) {
    return localStorage.getItem("employeeToken");
  }
  return localStorage.getItem("customerToken");
}

// ===============================
// Request interceptor (JWT)
// ===============================
axiosClient.interceptors.request.use(
  (config) => {
    const portalToken = pickTokenByPortalPath();

    // fallback to legacy keys (for old pages)
    const token =
      portalToken ||
      localStorage.getItem("authToken") ||
      localStorage.getItem("token");

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    } else if (config.headers?.Authorization) {
      delete config.headers.Authorization;
    }

    // DEV-only logging
    if (import.meta?.env?.DEV) {
      const url = String(config?.url || "");
      const base = String(config?.baseURL || "");
      const isApiCall =
        base.includes("/api") || url.startsWith("/api") || url.startsWith("/");

      if (isApiCall) {
        console.log("[axios] request", {
          method: String(config?.method || "GET").toUpperCase(),
          url,
          hasAuthHeader: !!config?.headers?.Authorization,
          tokenKey: portalToken
            ? "portalToken"
            : localStorage.getItem("authToken")
            ? "authToken"
            : localStorage.getItem("token")
            ? "token"
            : null,
          portalPath: window.location?.pathname,
        });
      }
    }

    // ✅ Do NOT force Content-Type for FormData (let axios set boundary)
    const isFormData =
      typeof FormData !== "undefined" && config.data instanceof FormData;

    if (!isFormData) {
      config.headers = config.headers || {};
      config.headers["Content-Type"] = "application/json";
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// ===============================
// Response interceptor (AUTH SAFE)
// ===============================
axiosClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = String(error?.config?.url || "");
    const message = String(error?.response?.data?.message || "");

    const isAuthCall =
      url.includes("/auth/staff-login") ||
      url.includes("/auth/login") ||
      url.includes("/auth/customer-signup") ||
      url.includes("/auth/customer-login") ||
      url.includes("/auth/verify-email") ||
      url.includes("/auth/resend-verification") ||
      url.includes("/auth/forgot-password") ||
      url.includes("/auth/verify-code") ||
      url.includes("/auth/reset-password");

    if ((status === 401 || status === 403) && !isAuthCall) {
      console.log("AUTH FAIL:", {
        status,
        url,
        message,
        data: error?.response?.data,
        authHeader: error?.config?.headers?.Authorization,
        portalPath: window.location?.pathname,
      });

      // 401 => always logout (token invalid/expired)
      // 403 => DO NOT logout (permission issue)
      if (status === 401) {
        clearAuthStorage();
        emitLogout("401", { status, url });
      }
    }

    return Promise.reject(normalizeAxiosError(error));
  }
);

export default axiosClient;
