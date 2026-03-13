import { useEffect, useState } from "react";
import styles from "./UserProfile.module.css";
import { useAuth } from "../../context/AuthContext";
import toast from "react-hot-toast";

export default function UserProfile() {
  const { role: authRole } = useAuth();
  const roleFromAuth = String(authRole || "").trim().toUpperCase();
  const isEmployee = roleFromAuth === "EMPLOYEE";

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem("userProfile");
      if (!raw) return;
      const p = JSON.parse(raw);

      if (typeof p.firstName === "string") setFirstName(p.firstName);
      if (typeof p.lastName === "string") setLastName(p.lastName);
      if (typeof p.email === "string") setEmail(p.email);
      if (typeof p.phone === "string") setPhone(p.phone);
    } catch {
      // ignore invalid localStorage
    }
  }, []);

  const handleSaveChanges = () => {
    const payload = { firstName, lastName, email, phone };
    localStorage.setItem("userProfile", JSON.stringify(payload));
    toast.success("Profile saved (stored locally on this device).");
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.title}>Profile</div>

      <div className={styles.grid2}>
        <div className={styles.block}>
          <div className={styles.label}>First Name</div>
          <input
            className={styles.input}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="First name"
          />
        </div>

        <div className={styles.block}>
          <div className={styles.label}>Last Name</div>
          <input
            className={styles.input}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Last name"
          />
        </div>

        <div className={styles.block}>
          <div className={styles.label}>Email Address</div>
          <input
            className={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            readOnly={isEmployee}
            placeholder="Email"
          />
        </div>

        <div className={styles.block}>
          <div className={styles.label}>Phone Number</div>
          <input
            className={styles.input}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+94 7X XXX XXXX"
          />
        </div>
      </div>

      <div className={styles.footer}>
        <button type="button" className={styles.saveBtn} onClick={handleSaveChanges}>
          <span className={styles.saveIco} />
          Save Changes
        </button>
      </div>
    </div>
  );
}
