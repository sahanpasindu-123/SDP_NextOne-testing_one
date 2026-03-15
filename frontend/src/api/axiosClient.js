import axios from "axios";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const axiosClient = axios.create({ baseURL });
const INTERCEPTOR_FLAG = "__axiosClientInterceptorsRegistered";

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
      response: undefined,
      data: undefined,
      raw: error,
    };
  }

  const status = error?.response?.status ?? null;
  const data = error?.response?.data;

  const message =
    (typeof data?.message === "string" && data.message) ||
    (typeof data?.error === "string" && data.error) ||
    (typeof error?.message === "string" && error.message) ||
    "Request failed";

  const errors = Array.isArray(data?.errors) ? data.errors : undefined;

  return {
    status,
    message,
    errors,
    response: error?.response,
    data,
    raw: error,
  };
}

// ===============================
// Helpers (AUTH)
// ===============================
function clearAuthStorage() {
  const keys = [
    "authToken",
    "token",
    "role",
    "adminToken",
    "employeeToken",
    "customerToken",
    "user",
    "admin",
    "employee",
  ];

  for (const store of [localStorage, sessionStorage]) {
    try {
      keys.forEach((k) => store.removeItem(k));
    } catch {
      // ignore
    }
  }
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
    return sessionStorage.getItem("adminToken") || localStorage.getItem("adminToken");
  }
  if (path.startsWith("/employee")) {
    return sessionStorage.getItem("employeeToken") || localStorage.getItem("employeeToken");
  }
  return sessionStorage.getItem("customerToken") || localStorage.getItem("customerToken");
}

// Some endpoints are role-specific regardless of the current UI portal path.
// Keep this narrow to avoid changing unrelated behavior.
function pickTokenByRequestUrl(url) {
  const u = String(url || "");
  if (!u) return null;

  // Employee reservations APIs should always use the employee token when available.
  if (u.includes("employee-reservations")) {
    return sessionStorage.getItem("employeeToken") || localStorage.getItem("employeeToken");
  }

  return null;
}

if (!axiosClient[INTERCEPTOR_FLAG]) {
  axiosClient[INTERCEPTOR_FLAG] = true;

  // ===============================
  // Request interceptor (JWT)
  // ===============================
axiosClient.interceptors.request.use(
  (config) => {
    const urlToken = pickTokenByRequestUrl(config?.url);
    const portalToken = urlToken || pickTokenByPortalPath();

    // fallback to legacy keys (for old pages)
    const token =
      portalToken ||
      sessionStorage.getItem("authToken") ||
      sessionStorage.getItem("token") ||
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
            : sessionStorage.getItem("authToken")
            ? "session:authToken"
            : sessionStorage.getItem("token")
            ? "session:token"
            : localStorage.getItem("authToken")
            ? "authToken"
            : localStorage.getItem("token")
            ? "token"
            : null,
          portalPath: window.location?.pathname,
        });
      }
    }

    //  Do NOT force Content-Type for FormData (let axios set boundary)
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
}

export default axiosClient;
