import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./AdminLogin.module.css";
import { authAPI } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";

export default function AdminLogin() {
  const [adminId, setAdminId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { login } = useAuth();

  const clearAuth = () => {
    for (const store of [localStorage, sessionStorage]) {
      store.removeItem("token");
      store.removeItem("authToken");
      store.removeItem("role");
      store.removeItem("adminToken");
      store.removeItem("employeeToken");
      store.removeItem("customerToken");
      store.removeItem("user");
      store.removeItem("userId");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setError("");
    setLoading(true);
    clearAuth();

    try {
      // ✅ FIX: send payload object
      const result = await authAPI.staffLogin({
        adminId: adminId,
        password: password,
      });

      if (!result?.token || result?.role !== "ADMIN") {
        throw new Error("Invalid Admin ID or Password");
      }

      // Save auth
      login(result.token, "ADMIN");

      // Navigate
      navigate("/admin/dashboard", { replace: true });
    } catch (err) {
      clearAuth();
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Invalid Admin ID or Password";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Admin Login</h1>

        {error && (
          <div className={styles.errorBox}>
            <span>{error}</span>
            <button onClick={() => setError("")}>OK</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>Admin ID</label>
          <input
            className={styles.input}
            type="text"
            value={adminId}
            onChange={(e) => setAdminId(e.target.value)}
            required
          />

          <label className={styles.label}>Password</label>
          <input
            className={styles.input}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button className={styles.btn} type="submit" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
