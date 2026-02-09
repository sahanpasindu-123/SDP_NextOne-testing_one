import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authAPI } from "../../../api/auth";
import styles from "./Auth.module.css";

export default function VerifyEmail() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const savedEmail = localStorage.getItem("pendingVerifyEmail");
    if (savedEmail) setEmail(savedEmail);
  }, []);

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");

    if (!email || !code) {
      setError("Email and code required.");
      return;
    }

    try {
      const res = await authAPI.verifyEmail({ email, code });

      if (!res?.success) {
        setError(res?.message || "Verification failed");
        return;
      }

      // authAPI.verifyEmail() normalizes token to res.token.
      const token = res?.token || res?.data?.token || res?.data?.data?.token;
      const user = res?.user || res?.data?.user || res?.data?.data?.user;

      if (token) localStorage.setItem("token", token);
      if (user) localStorage.setItem("user", JSON.stringify(user));

      localStorage.removeItem("pendingVerifyEmail");

      // ✅ Verified success → go to Home
      navigate("/customer/home");
    } catch (err) {
      setError(err?.response?.data?.message || "Invalid code or expired");
    }
  };

  const handleResend = async () => {
    setError("");

    if (!email) {
      setError("Email is required to resend code.");
      return;
    }

    try {
      const res = await authAPI.resendVerification({ email });
      alert(res?.message || "Code resent");
    } catch (err) {
      alert(err?.response?.data?.message || "Resend failed");
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.title}>Verify Email</div>

      {error ? <div className={styles.error}>{error}</div> : null}

      <form onSubmit={handleVerify}>
        <label className={styles.label}>Email</label>
        <input
          className={styles.input}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
        />

        <label className={styles.label}>Verification Code</label>
        <input
          className={styles.input}
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="6-digit code"
        />

        <button className={styles.primary} type="submit">
          Verify
        </button>

        {/* ✅ Resend button */}
        <button
          className={styles.primary}
          type="button"
          onClick={handleResend}
          style={{ marginTop: 10 }}
        >
          Resend Code
        </button>
      </form>

      <div className={styles.bottom}>
        Back to{" "}
        <Link className={styles.link} to="/customer/signin">
          Sign in
        </Link>
      </div>
    </div>
  );
}
