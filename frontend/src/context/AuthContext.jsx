import { createContext, useContext, useMemo, useState, useEffect, useCallback } from 'react'
import { authAPI } from "../api/auth";

const AuthContext = createContext()

export function useAuth() {
  return useContext(AuthContext)
}

function normalizeRole(r) {
  return String(r || "").trim().toUpperCase();
}

export function AuthProvider({ children }) {
  const [initializing, setInitializing] = useState(true)
  const [token, setToken] = useState(null)
  const [role, setRole] = useState(null)

  const isLoggedIn = !!token

  const clearStorage = useCallback(() => {
    localStorage.removeItem('authToken')
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('adminToken')
    localStorage.removeItem('employeeToken')
    localStorage.removeItem('customerToken')
    localStorage.removeItem('user')
    localStorage.removeItem('admin')
    localStorage.removeItem('employee')
  }, [])

  // Best-effort local JWT expiry check (works if token is a standard JWT)
  // Supports base64url decoding.
  const isJwtExpired = useCallback((jwt) => {
    try {
      const parts = String(jwt || "").split(".");
      if (parts.length !== 3) return false; // unknown format; let backend decide

      // base64url -> base64
      const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const padded = b64.padEnd(b64.length + (4 - (b64.length % 4)) % 4, "=");
      const payload = JSON.parse(atob(padded));

      const exp = payload?.exp;
      if (!exp) return false;
      const now = Math.floor(Date.now() / 1000);
      return now >= exp;
    } catch {
      return false;
    }
  }, [])

  // Optional: pass role if you have it (ADMIN / EMPLOYEE / CUSTOMER)
  const login = useCallback((token, userRole) => {
    //  keep both keys in sync to avoid intermittent 401s across legacy code
    localStorage.setItem('authToken', token)
    localStorage.setItem('token', token)
    setToken(token)
    setInitializing(false)

    if (userRole) {
      const R = normalizeRole(userRole)
      localStorage.setItem('role', R)
      setRole(R)
    }
  }, [])

  // logout + redirect to correct login page
  const logout = useCallback(({ reason } = {}) => {
    // clear tokens + role
    clearStorage()

    setToken(null)
    setRole(null)
    setInitializing(false)

    // IMPORTANT:
    // Do NOT redirect here.
    // Portal-aware ProtectedRoute will redirect based on explicit portal prop.
    if (reason) {
      console.log('Logged out:', reason)
    }
  }, [clearStorage])

  useEffect(() => {
    let cancelled = false;

    async function initAuth() {
      setInitializing(true)

      //  accept both keys used across this repo (legacy + normalized)
      const storedToken = localStorage.getItem('authToken') || localStorage.getItem('token')
      const storedRole = normalizeRole(localStorage.getItem('role'))

      // No token at all
      if (!storedToken) {
        if (!cancelled) {
          setToken(null)
          setRole(null)
          setInitializing(false)
        }
        return;
      }

      // Token exists but is expired (if it looks like a JWT)
      if (isJwtExpired(storedToken)) {
        clearStorage()
        if (!cancelled) {
          setToken(null)
          setRole(null)
          setInitializing(false)
        }
        return;
      }

      // If role already present, we're done.
      if (storedRole) {
        if (!cancelled) {
          setToken(storedToken)
          setRole(storedRole)
          setInitializing(false)
        }
        return;
      }

      // Role missing: rehydrate from backend without redirecting.
      // This prevents refresh from looking logged out.
      try {
        const me = await authAPI.me();
        const hydratedRole = normalizeRole(me?.role || me?.data?.role || me?.user?.role);

        if (!hydratedRole) {
          // Backend didn't give a usable role; treat as invalid session.
          clearStorage()
          if (!cancelled) {
            setToken(null)
            setRole(null)
            setInitializing(false)
          }
          return;
        }

        localStorage.setItem('role', hydratedRole)
        if (!cancelled) {
          setToken(storedToken)
          setRole(hydratedRole)
          setInitializing(false)
        }
      } catch (e) {
        // 401s will also be handled by axios interceptor, but we harden here.
        clearStorage()
        if (!cancelled) {
          setToken(null)
          setRole(null)
          setInitializing(false)
        }
      }
    }

    initAuth();

    // Allow axios (or other code) to trigger logout without navigating.
    const onLogout = (e) => {
      const reason = e?.detail?.reason
      logout({ reason })
    }
    window.addEventListener('auth:logout', onLogout)

    return () => {
      cancelled = true;
      window.removeEventListener('auth:logout', onLogout)
    }
  }, [clearStorage, isJwtExpired, logout])

  const value = useMemo(
    () => ({
      initializing,
      token,
      isLoggedIn,
      role,
      login,
      logout,
    }),
    [initializing, token, isLoggedIn, role, login, logout]
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
