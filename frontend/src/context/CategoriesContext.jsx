import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from "react";
import { categoriesAPI } from "../api/categories";

const CategoriesContext = createContext(null);

export function CategoriesProvider({ children }) {
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const didInitialFetchRef = useRef(false);

  const refreshCategories = useCallback(async () => {
    const token = localStorage.getItem("authToken");

    // ✅ If no token, do NOT call protected endpoint
    if (!token) {
      console.log("refreshCategories() skipped: no authToken");
      return;
    }

    setLoadingCategories(true);
    try {
      const res = await categoriesAPI.getAll();

      console.log("refreshCategories() response:", res?.success, res?.data?.length);

      if (res?.success) {
        setCategories(res.data || []);
      } else {
        // optional: clear categories if backend says fail
        setCategories([]);
      }
    } catch (err) {
      console.error("refreshCategories failed:", err?.response?.status, err?.response?.data || err?.message);
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  // ✅ Load once on app start (ONLY if token exists)
  useEffect(() => {
    // React.StrictMode intentionally double-invokes effects in dev.
    // This guard prevents duplicate API calls (and duplicate 401 spam) on mount.
    if (didInitialFetchRef.current) return;
    didInitialFetchRef.current = true;

    const token = localStorage.getItem("authToken");
    if (token) {
      refreshCategories();
    } else {
      console.log("CategoriesProvider: no authToken on start, not fetching categories");
    }
  }, [refreshCategories]);

  const value = useMemo(
    () => ({
      categories,
      loadingCategories,
      refreshCategories,
      setCategories,
    }),
    [categories, loadingCategories, refreshCategories]
  );

  return <CategoriesContext.Provider value={value}>{children}</CategoriesContext.Provider>;
}

export function useCategories() {
  const ctx = useContext(CategoriesContext);
  if (!ctx) throw new Error("useCategories must be used within CategoriesProvider");
  return ctx;
}
