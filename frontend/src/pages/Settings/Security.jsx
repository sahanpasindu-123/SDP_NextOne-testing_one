import { useState } from "react";
import styles from "./Security.module.css";
import { changeEmployeePassword } from "../../api/employees";
import { changeAdminPassword } from "../../api/admin";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

export default function Security() {
  const [cur, setCur] = useState("");
  const [nw, setNw] = useState("");
  const [conf, setConf] = useState("");

  const { role: authRole } = useAuth();
  const role = String(authRole || localStorage.getItem("role") || "").trim().toUpperCase(); // "ADMIN" | "EMPLOYEE"
  const isEmployee = role === "EMPLOYEE";

  const handleUpdatePassword = async () => {
    try {
      // 1) Frontend validations
      if (!cur || !nw || !conf) {
        toast.error("Please fill all fields");
        return;
      }
      if (nw !== conf) {
        toast.error("New password and confirm password do not match");
        return;
      }
      if (nw.length < 8) {
        toast.error("New password must be at least 8 characters");
        return;
      }

      // 2) Call correct API based on role
      let res;
      if (role === "ADMIN") {
        res = await changeAdminPassword({
          currentPassword: cur,
          newPassword: nw,
        });
      } else if (role === "EMPLOYEE") {
        res = await changeEmployeePassword({
          currentPassword: cur,
          newPassword: nw,
        });
      } else {
        toast.error("Invalid role");
        return;
      }

      // 3) Success
      toast.success(res?.data?.message || "Password updated successfully");

      // 4) Clear inputs
      setCur("");
      setNw("");
      setConf("");
    } catch (err) {
      console.log("STATUS:", err?.status ?? err?.response?.status);
      console.log("DATA:", err?.data ?? err?.response?.data);
      console.log("FULL:", err);

      toast.error(
        err?.message ||
          err?.data?.message ||
          err?.response?.data?.message ||
          "Password update failed"
      );
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.title}>{isEmployee ? "Change Password" : "Security Settings"}</div>

      <div className={styles.sectionLabel}>Password</div>

      <div className={styles.block}>
        <div className={styles.label}>Current Password</div>
        <input
          className={styles.input}
          type="password"
          value={cur}
          onChange={(e) => setCur(e.target.value)}
        />
      </div>

      <div className={styles.block}>
        <div className={styles.label}>New Password</div>
        <input
          className={styles.input}
          type="password"
          value={nw}
          onChange={(e) => setNw(e.target.value)}
        />
      </div>

      <div className={styles.block}>
        <div className={styles.label}>Confirm New Password</div>
        <input
          className={styles.input}
          type="password"
          value={conf}
          onChange={(e) => setConf(e.target.value)}
        />
      </div>

      <button
        type="button"
        className={styles.updateBtn}
        onClick={handleUpdatePassword}
      >
        {isEmployee ? "Change Password" : "Update Password"}
      </button>
    </div>
  );
}
