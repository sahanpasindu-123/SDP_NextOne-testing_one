import { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "./EmployeeLogin.module.css";
import { authAPI } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";

export default function EmployeeLogin() {
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const clearAuth = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    localStorage.removeItem("userId");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    clearAuth();

    try {
      // ✅ FIX: correct payload
      const result = await authAPI.staffLogin({
        employeeId: employeeId,
        password: password,
      });

      if (!result?.token || result?.role !== "EMPLOYEE") {
        throw new Error("Invalid Employee ID or Password");
      }

      // Save auth
      login(result.token, "EMPLOYEE");

      // Navigate
      navigate("/employee/dashboard", { replace: true });
    } catch (err) {
      clearAuth();
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Invalid Employee ID or Password";
      alert(msg);
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
