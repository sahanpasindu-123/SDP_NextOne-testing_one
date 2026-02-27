import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function normalizeRole(r) {
  return String(r || "").trim().toUpperCase();
}

function normalizePortal(p) {
  const v = String(p || "").trim().toLowerCase();
  if (v === "admin" || v === "employee" || v === "customer") return v;
  return "";
}

function portalSigninPath(portal) {
  const p = normalizePortal(portal);
  // Explicitly do NOT infer from pathname (security: never cross-portal redirect)
  if (p === "admin") return "/admin/signin";
  if (p === "employee") return "/employee/signin";
  if (p === "customer") return "/customer/signin";
  // Hard fallback (should never happen if portal prop is provided)
  return "/customer/signin";
}

/**
 * ProtectedRoute
 *
 * Requirements:
 * - Must be portal-aware and NEVER infer login routes from pathname.
 * - Must redirect ONLY to that portal's signin page.
 *
 * Props:
 * - portal: 'customer' | 'employee' | 'admin' (required)
 * - allowedRoles: array of allowed roles (case-insensitive)
 */
export default function ProtectedRoute({ children, portal, allowedRoles = [] }) {
  const location = useLocation();

  const { initializing, token, role } = useAuth();

  const allowed = Array.isArray(allowedRoles)
    ? allowedRoles.map(normalizeRole)
    : [];

  const signin = portalSigninPath(portal);
  const atSignin = location.pathname === signin;
  const authReady = !initializing && token !== undefined;
  const normalizedRole = normalizeRole(role);

  // IMPORTANT: delay route decisions until auth initialization completes.
  // This prevents refresh from redirecting to login while we rehydrate role.
  if (!authReady) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        Loading...
      </div>
    );
  }

  // Not logged in -> redirect ONLY to the portal signin (no inference)
  if (!token) {
    if (atSignin) {
      return children;
    }
    return <Navigate to={signin} state={{ from: location.pathname }} replace />;
  }

  // If route is role-gated, require a role. AuthContext will attempt rehydration.
  if (allowed.length && !normalizedRole) {
    return (
      <div style={{ padding: 24, textAlign: "center" }}>
        Loading...
      </div>
    );
  }

  // Role not allowed -> stay within this portal and go to this portal's signin
  if (allowed.length && normalizedRole && !allowed.includes(normalizedRole)) {
    if (atSignin) {
      return children;
    }
    return <Navigate to={signin} state={{ from: location.pathname, reason: "ROLE_MISMATCH" }} replace />;
  }

  return children;
}
