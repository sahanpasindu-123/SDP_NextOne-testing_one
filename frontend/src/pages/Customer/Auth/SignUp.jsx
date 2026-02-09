import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import styles from "./Auth.module.css";
import { authAPI } from "../../../api/auth";

/* ================= PHONE HELPERS ================= */

// Validate Sri Lankan phone number
const isValidSLPhone = (phone) => {
  const cleaned = phone.replace(/\s+/g, "");
  const regex = /^(?:\+94|94|0)7\d{8}$/;
  return regex.test(cleaned);
};

// Auto-format to +94XXXXXXXXX
const formatSLPhone = (phone) => {
  let p = phone.replace(/\s+/g, "");

  if (p.startsWith("+94")) return p;
  if (p.startsWith("94")) return `+${p}`;
  if (p.startsWith("0")) return `+94${p.slice(1)}`;

  return p;
};

export default function SignUp() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    contact: "",
    password: "",
    confirmPassword: "",
  });

  const [error, setError] = useState("");

  const onChange = (e) => {
    const { name, value } = e.target;

    // 🔥 Auto-format contact number while typing
    if (name === "contact") {
      setFormData((p) => ({
        ...p,
        contact: value.replace(/[^\d+]/g, ""), // allow only numbers & +
      }));
      return;
    }

    setFormData((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.name || !formData.email || !formData.contact || !formData.password) {
      setError("Please fill all fields.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    // ✅ Phone validation
    if (!isValidSLPhone(formData.contact)) {
      setError("Please enter a valid Sri Lankan phone number.");
      return;
    }

    // ✅ Auto-format before sending to backend
    const formattedPhone = formatSLPhone(formData.contact);

    try {
      const res = await authAPI.customerSignup({
        name: formData.name,
        email: formData.email,
        contact: formattedPhone, // 🔥 always +94 format
        password: formData.password,
      });

      if (!res?.success) {
        setError(res?.message || "Signup failed");
        return;
      }

      // Verify flow
      localStorage.setItem("pendingVerifyEmail", formData.email);
      navigate("/auth/verify-email");
      return;
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Signup failed";

      if (msg.toLowerCase().includes("not verified")) {
        localStorage.setItem("pendingVerifyEmail", formData.email);
        navigate("/auth/verify-email");
        return;
      }

      setError(msg);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.title}>Sign Up</div>

      {error ? <div className={styles.error}>{error}</div> : null}

      <form onSubmit={handleSubmit}>
        <label className={styles.label}>Name</label>
        <input
          className={styles.input}
          placeholder="Enter Name"
          name="name"
          value={formData.name}
          onChange={onChange}
        />

        <label className={styles.label}>Email</label>
        <input
          className={styles.input}
          placeholder="Enter Email"
          name="email"
          value={formData.email}
          onChange={onChange}
        />

        <label className={styles.label}>Contact</label>
        <input
          className={styles.input}
          placeholder="0771234567 or +94771234567"
          name="contact"
          value={formData.contact}
          onChange={onChange}
        />

        <label className={styles.label}>Password</label>
        <input
          className={styles.input}
          placeholder="Enter Password"
          type="password"
          name="password"
          value={formData.password}
          onChange={onChange}
        />

        <label className={styles.label}>Confirm Password</label>
        <input
          className={styles.input}
          placeholder="Confirm Password"
          type="password"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={onChange}
        />

        <button className={styles.primary} type="submit">
          Create Account
        </button>
      </form>

      <div className={styles.bottom}>
        Already a member?{" "}
        <Link className={styles.link} to="/customer/signin">
          Sign in
        </Link>
      </div>
    </div>
  );
}
