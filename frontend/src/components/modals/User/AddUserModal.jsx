import { useState } from "react";
import styles from "./AddUserModal.module.css";

export default function AddUserModal({
  open,
  onClose,
  onSubmit,
  defaultType = "employee", // "employee" | "customer"
}) {
  const [type, setType] = useState(defaultType);

  const [name, setName] = useState("");
  const [empId, setEmpId] = useState("");
  const [jobRole, setJobRole] = useState("");

  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    const payload =
      type === "employee"
        ? { type, name, id: empId, jobRole, password, confirmPassword }
        : { type, name, email, contactNumber, password, confirmPassword };

    onSubmit?.(payload);
  };

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <div className={styles.top}>
          <div className={styles.title}>Add New User</div>
          <button className={styles.close} type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.block}>
            <div className={styles.label}>User Type</div>
            <div className={styles.radios}>
              <label className={styles.radio}>
                <input
                  type="radio"
                  name="userTypeAdd"
                  checked={type === "employee"}
                  onChange={() => setType("employee")}
                />
                <span>Employee</span>
              </label>

              <label className={styles.radio}>
                <input
                  type="radio"
                  name="userTypeAdd"
                  checked={type === "customer"}
                  onChange={() => setType("customer")}
                />
                <span>Customer</span>
              </label>
            </div>
          </div>

          <div className={styles.block}>
            <div className={styles.label}>Name</div>
            <input
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              type="text"
            />
          </div>

          {type === "employee" ? (
            <>
              <div className={styles.block}>
                <div className={styles.label}>Id</div>
                <input
                  className={styles.input}
                  value={empId}
                  onChange={(e) => setEmpId(e.target.value)}
                  type="text"
                />
              </div>

              <div className={styles.block}>
                <div className={styles.label}>Job Role</div>
                <input
                  className={styles.input}
                  value={jobRole}
                  onChange={(e) => setJobRole(e.target.value)}
                  type="text"
                />
              </div>
            </>
          ) : (
            <>
              <div className={styles.block}>
                <div className={styles.label}>Email</div>
                <input
                  className={styles.input}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                />
              </div>

              <div className={styles.block}>
                <div className={styles.label}>Contact Number</div>
                <input
                  className={styles.input}
                  value={contactNumber}
                  onChange={(e) => setContactNumber(e.target.value)}
                  type="text"
                />
              </div>
            </>
          )}

          <div className={styles.block}>
            <div className={styles.label}>Password</div>
            <input
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
            />
          </div>

          <div className={styles.block}>
            <div className={styles.label}>Confirm Password</div>
            <input
              className={styles.input}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              type="password"
            />
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.primaryBtn}>
              Add User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
