import { useState } from "react";
import styles from "./Auth.module.css";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { authAPI } from "../../../api/auth";

export default function VerifyCode() {
  const navigate = useNavigate();
  const location = useLocation();

  // ForgotPassword page එකෙන් pass කරපු email
  const email = location.state?.email || "";

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async () => {
    setError("");

    if (!code) {
      setError("Please enter the verification code");
      return;
    }

    if (!email) {
      setError("Missing email. Please restart the process.");
      return;
    }

    try {
      setLoading(true);

      const data = await authAPI.verifyResetCode({ email, code });

      if (!data?.success) {
        setError(data?.message || "Invalid or expired code");
        return;
      }

      // ✅ Code correct → go to reset password page
      navigate("/auth/reset", {
        state: { email, code },
      });
    } catch (err) {
      setError(err?.message || "Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.title}>Verify Code</div>
      <div className={styles.hint}>
        Enter the 6-digit code sent to your email.
      </div>

      <label className={styles.label}>Code</label>
      <input
        className={styles.input}
        placeholder="Enter Code"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />

      <button
        type="button"
        className={styles.primary}
        onClick={handleVerify}
        disabled={loading}
      >
        {loading ? "Verifying..." : "Verify"}
      </button>

      {error && <div style={{ color: "red", marginTop: 10 }}>{error}</div>}

      <div className={styles.bottom}>
        <Link className={styles.link} to="/auth/forgot">
          Back
        </Link>
      </div>
    </div>
  );
}
