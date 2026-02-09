import { useState } from "react";
import styles from "./Security.module.css";
import { changeEmployeePassword } from "../../api/employees";
import { changeAdminPassword } from "../../api/admin";

export default function Security() {
  const [cur, setCur] = useState("");
  const [nw, setNw] = useState("");
  const [conf, setConf] = useState("");

  // role stored at login time
  const role = localStorage.getItem("role"); // "ADMIN" | "EMPLOYEE"

  const handleUpdatePassword = async () => {
    try {
      // 1️⃣ Frontend validations
      if (!cur || !nw || !conf) {
        alert("Please fill all fields");
        return;
      }
      if (nw !== conf) {
        alert("New password and confirm password do not match");
        return;
      }
      if (nw.length < 8) {
        alert("New password must be at least 8 characters");
        return;
      }

      // 2️⃣ Call correct API based on role
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
        alert("Invalid role");
        return;
      }

      // 3️⃣ Success
      alert(res?.data?.message || "Password updated successfully");

      // 4️⃣ Clear inputs
      setCur("");
      setNw("");
      setConf("");
    } catch (err) {
      console.log("STATUS:", err?.response?.status);
      console.log("DATA:", err?.response?.data);
      console.log("FULL:", err);

      alert(err?.response?.data?.message || "Password update failed");
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.title}>Security Settings</div>

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
        Update Password
      </button>
    </div>
  );
}
