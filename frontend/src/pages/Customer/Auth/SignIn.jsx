import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import styles from "./Auth.module.css";
import { FiEye } from "react-icons/fi";
import { authAPI } from "../../../api/auth";
import toast from "react-hot-toast";

export default function SignIn() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [showPass, setShowPass] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const handleChange = (e) => {
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await authAPI.customerLogin({
        email: formData.email,
        password: formData.password,
      });

      const token = res?.token;

      if (!token) {
        toast.error("Login succeeded but token missing.");
        return;
      }

      login(token, "CUSTOMER", { remember: rememberMe });
      navigate("/customer/home");
    } catch (err) {
      const msg = err?.response?.data?.message || "Invalid email or password";

      if (msg.toLowerCase().includes("not verified")) {
        localStorage.setItem("pendingVerifyEmail", formData.email);
        navigate("/auth/verify-email");
        return;
      }

      toast.error(msg);
    }
  };

  return (
    /* ✅ THIS WRAPPER FIXES CENTERING */
    <div className={styles.pageCenter}>
      <div className={styles.card}>
        <div className={styles.title}>Sign In</div>

        <form onSubmit={handleSubmit}>
          <label className={styles.label}>Email</label>
          <input
            className={styles.input}
            placeholder="Enter Email"
            name="email"
            value={formData.email}
            onChange={handleChange}
          />

          <label className={styles.label}>Password</label>
          <div className={styles.passRow}>
            <input
              className={styles.input}
              placeholder="Enter your password"
              type={showPass ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
            />
            <button
              type="button"
              className={styles.eye}
              aria-label="show password"
              onClick={() => setShowPass((p) => !p)}
            >
              <FiEye />
            </button>
          </div>

          <div className={styles.rowBetween}>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <span>Remember me</span>
            </label>

            <Link
              className={styles.link}
              to="/auth/forgot"
              state={{ email: formData.email }}
            >
              Forgot password?
            </Link>
          </div>

          <button className={styles.primary} type="submit">
            Sign In
          </button>
        </form>

        <div className={styles.bottom}>
          Not a member?{" "}
          <Link className={styles.link} to="/auth/signup">
            Signup now
          </Link>
        </div>
      </div>
    </div>
  );
}
