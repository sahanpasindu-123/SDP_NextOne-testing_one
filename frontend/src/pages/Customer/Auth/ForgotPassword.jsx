import { useState } from "react";
import styles from "./Auth.module.css";
import { Link, useNavigate } from "react-router-dom";
import { authAPI } from "../../../api/auth";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    setError("");

    if (!email) {
      setError("Please enter your email");
      return;
    }

    try {
      setLoading(true);

      const data = await authAPI.forgotPassword({ email });

      if (!data?.success) {
        setError(data?.message || "Failed to send code");
        return;
      }

      // ✅ AFTER sending code → go to verify page
      navigate("/auth/verify", {
        state: { email },
      });
    } catch (err) {
      setError(err?.message || "Server error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.title}>Forgot Password</div>
      <div className={styles.hint}>
        Enter your email to receive a verification code.
      </div>

      <label className={styles.label}>Email</label>
      <input
        className={styles.input}
        type="email"
        placeholder="Enter Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <button
        type="button"
        className={styles.primary}
        onClick={handleSendCode}
        disabled={loading}
      >
        {loading ? "Sending..." : "Send Code"}
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
