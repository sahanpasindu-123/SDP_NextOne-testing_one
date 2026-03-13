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
    const keys = [
      'authToken',
      'token',
      'role',
      'adminToken',
      'employeeToken',
      'customerToken',
      'user',
      'admin',
      'employee',
    ]

    for (const store of [localStorage, sessionStorage]) {
      try {
        keys.forEach((k) => store.removeItem(k))
      } catch {
        // ignore
      }
    }
  }, [])

  const storageGet = useCallback((key) => {
    try {
      return sessionStorage.getItem(key) || localStorage.getItem(key)
    } catch {
      return null
    }
  }, [])

  const pickStorageForExistingToken = useCallback((storedToken) => {
    try {
      if (!storedToken) return localStorage
      const sTok = sessionStorage.getItem('authToken') || sessionStorage.getItem('token')
      if (sTok && sTok === storedToken) return sessionStorage
      const lTok = localStorage.getItem('authToken') || localStorage.getItem('token')
      if (lTok && lTok === storedToken) return localStorage
      return sessionStorage.getItem('authToken') || sessionStorage.getItem('token')
        ? sessionStorage
        : localStorage
    } catch {
      return localStorage
    }
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
  // Options: { remember?: boolean } (default true => localStorage; false => sessionStorage)
  const login = useCallback((jwt, userRole, options = {}) => {
    const remember = options?.remember !== false
    const store = remember ? localStorage : sessionStorage

    // Prevent mixed auth state (stale tokens across storages/roles)
    clearStorage()

    // keep both keys in sync to avoid intermittent 401s across legacy code
    store.setItem('authToken', jwt)
    store.setItem('token', jwt)

    const R = userRole ? normalizeRole(userRole) : null
    if (R) {
      store.setItem('role', R)
      if (R === 'ADMIN') store.setItem('adminToken', jwt)
      if (R === 'EMPLOYEE') store.setItem('employeeToken', jwt)
      if (R === 'CUSTOMER') store.setItem('customerToken', jwt)
    }

    setToken(jwt)
    setRole(R)
    setInitializing(false)
  }, [clearStorage])

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

      // accept both keys used across this repo (legacy + normalized), and both storages (remember-me)
      const storedToken = storageGet('authToken') || storageGet('token')
      const storedRole = normalizeRole(storageGet('role'))

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

        const store = pickStorageForExistingToken(storedToken)
        store.setItem('role', hydratedRole)
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
  }, [clearStorage, isJwtExpired, logout, pickStorageForExistingToken, storageGet])

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
