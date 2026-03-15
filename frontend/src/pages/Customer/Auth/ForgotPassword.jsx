import { useState } from "react";
import styles from "./Auth.module.css";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { authAPI } from "../../../api/auth";

export default function ForgotPassword() {
  const navigate = useNavigate();
  const location = useLocation();

  const prefillEmail = (() => {
    const candidates = [];

    if (typeof location.state?.email === "string") candidates.push(location.state.email);

    const qp = new URLSearchParams(location.search).get("email");
    if (typeof qp === "string") candidates.push(qp);

    try {
      const pending = localStorage.getItem("pendingVerifyEmail");
      if (typeof pending === "string") candidates.push(pending);
    } catch {}

    try {
      const raw = localStorage.getItem("userProfile");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (typeof parsed?.email === "string") candidates.push(parsed.email);
      }
    } catch {}

    const best = candidates.find((v) => String(v || "").trim());
    return best ? String(best).trim() : "";
  })();

  const [email, setEmail] = useState(prefillEmail);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendCode = async () => {
    setError("");

    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setError("Please enter your email");
      return;
    }

    try {
      setLoading(true);

      const data = await authAPI.forgotPassword({ email: normalizedEmail });

      if (!data?.success) {
        setError(data?.message || "Failed to send code");
        return;
      }

      // ✅ AFTER sending code → go to verify page
      navigate("/auth/verify", {
        state: { email: normalizedEmail },
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
        placeholder="Enter your email"
        name="email"
        autoComplete="email"
        inputMode="email"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        aria-invalid={!!error}
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          if (error) setError("");
        }}
      />

      <button
        type="button"
        className={styles.primary}
        onClick={handleSendCode}
        disabled={loading}
        style={{ marginTop: 22 }}
      >
        {loading ? "Sending..." : "Send Code"}
      </button>

      {error && (
        <div style={{ color: "#ef4444", marginTop: 12, textAlign: "center", fontWeight: 700 }}>
          {error}
        </div>
      )}

      <div className={styles.bottom}>
        <Link className={styles.link} to="/customer/signin">
          Back to Sign In
        </Link>
      </div>
    </div>
  );
}
