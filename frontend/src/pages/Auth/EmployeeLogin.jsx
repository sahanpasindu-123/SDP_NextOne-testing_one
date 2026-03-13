import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./EmployeeLogin.module.css";
import { authAPI } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";
import { useCategories } from "../../context/CategoriesContext";
import toast from "react-hot-toast";

export default function EmployeeLogin() {
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { refreshCategories } = useCategories();

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

    const normalizedEmployeeId = String(employeeId || "").trim();
    const rawPassword = String(password || "");

    if (!normalizedEmployeeId || !rawPassword) {
      toast.error("Employee ID and password are required.");
      return;
    }

    setLoading(true);
    clearAuth();

    try {
      // Send only required fields
      const result = await authAPI.staffLogin({
        employeeId: normalizedEmployeeId,
        password: rawPassword,
      });

      if (!result?.token || result?.role !== "EMPLOYEE") {
        throw new Error("Invalid Employee ID or Password");
      }

      // Save auth
      login(result.token, "EMPLOYEE");

      // Fetch categories after token is set
      await refreshCategories();

      // Navigate
      navigate("/employee/dashboard", { replace: true });
    } catch (err) {
      clearAuth();
      console.log(err?.response?.data);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Invalid Employee ID or Password";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>Employee Login</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>Employee ID</label>
          <input
            className={styles.input}
            type="text"
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
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
