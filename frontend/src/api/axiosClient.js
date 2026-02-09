import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const axiosClient = axios.create({ baseURL });

// ===============================
// Error normalization
// ===============================
// We want every API failure to be representable in the UI as:
// {
//   status: number | null,
//   message: string,
//   errors?: Array<{ field?: string, message: string }>,
//   isNetworkError?: boolean,
//   raw?: unknown
// }
export function normalizeAxiosError(error) {
  // Network / CORS / backend-down errors have no `response`
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

  // Prefer backend-provided message, fall back to axios message.
  const message =
    (typeof data?.message === "string" && data.message) ||
    (typeof error?.message === "string" && error.message) ||
    "Request failed";

  // `errors` can come from your global error handler or validation libs.
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
  // Keys used in this project (keep both for safety)
  localStorage.removeItem("authToken");
  localStorage.removeItem("token");
  localStorage.removeItem("role");

  // Optional extras (harmless if not used)
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
// Request interceptor (JWT)
// ===============================
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken") || localStorage.getItem("token");

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    // DEV-only: help debug intermittent 401s (missing Authorization)
    if (import.meta?.env?.DEV) {
      const url = String(config?.url || "");
      const base = String(config?.baseURL || "");
      const isApiCall = base.includes("/api") || url.startsWith("/api") || url.startsWith("/");
      if (isApiCall) {
        console.log("[axios] request", {
          method: String(config?.method || "GET").toUpperCase(),
          url,
          hasAuthHeader: !!config?.headers?.Authorization,
          tokenKey: localStorage.getItem("authToken") ? "authToken" : localStorage.getItem("token") ? "token" : null,
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

    // ✅ Do not redirect on auth endpoints (avoid loops)
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

    // ✅ Handle Unauthorized/Forbidden
    if ((status === 401 || status === 403) && !isAuthCall) {
      console.log("AUTH FAIL:", {
        status,
        url,
        message,
        data: error?.response?.data,
        authHeader: error?.config?.headers?.Authorization,
      });

      // 401: token invalid/expired/missing. Always log out.
      // 403: do NOT auto logout (usually permission issue), let UI show message.
      if (status === 401) {
        // IMPORTANT:
        // - Never hardcode /auth/* redirects here.
        // - Never infer portal from pathname.
        // - Clear storage and let portal-aware ProtectedRoute decide where to go.
        clearAuthStorage();
        emitLogout("401", { status, url });
      }
    }

    // Always reject a normalized shape so UI can show meaningful messages.
    // Keep original axios error inside `.raw` for debugging.
    return Promise.reject(normalizeAxiosError(error));
  }
);

export default axiosClient;
