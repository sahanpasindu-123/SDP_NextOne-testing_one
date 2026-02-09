import { useState } from "react";
import styles from "./Auth.module.css";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { authAPI } from "../../../api/auth";

export default function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  // VerifyCode page එකෙන් pass වෙච්ච data
  const email = location.state?.email || "";
  const code = location.state?.code || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    setError("");

    // Safety checks
    if (!email || !code) {
      setError("Session expired. Please restart password reset.");
      return;
    }

    if (!password || !confirmPassword) {
      setError("Please fill all fields");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    try {
      setLoading(true);

      const data = await authAPI.resetPassword({
        email,
        code,
        newPassword: password,
      });

      if (!data?.success) {
        setError(data?.message || "Failed to reset password");
        return;
      }

      // ✅ Password reset success → Sign In page
      navigate("/customer/signin");
    } catch (err) {
      setError(err?.message || "Server error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.title}>Reset Password</div>

      <label className={styles.label}>New Password</label>
      <input
        className={styles.input}
        type="password"
        placeholder="Enter new password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <label className={styles.label}>Confirm Password</label>
      <input
        className={styles.input}
        type="password"
        placeholder="Confirm password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
      />

      <button
        type="button"
        className={styles.primary}
        onClick={handleReset}
        disabled={loading}
      >
        {loading ? "Resetting..." : "Reset"}
      </button>

      {error && <div style={{ color: "red", marginTop: 10 }}>{error}</div>}

      <div className={styles.bottom}>
        <Link className={styles.link} to="/customer/signin">
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
