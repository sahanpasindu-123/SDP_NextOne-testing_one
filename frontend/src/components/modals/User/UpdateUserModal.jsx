import { useState } from "react";
import styles from "./UpdateUserModal.module.css";

export default function UpdateUserModal({
  open,
  onClose,
  onSubmit,
  initial, // pass from parent when opening (optional)
}) {
  const init = initial || {
    type: "employee",
    name: "",
    id: "",
    jobRole: "",
    email: "",
    contactNumber: "",
    status: "Inactive",
  };

  const [type, setType] = useState(init.type);

  const [name, setName] = useState(init.name);
  const [empId, setEmpId] = useState(init.id);
  const [jobRole, setJobRole] = useState(init.jobRole);

  const [email, setEmail] = useState(init.email);
  const [contactNumber, setContactNumber] = useState(init.contactNumber);

  const [status, setStatus] = useState(init.status);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();

    const payload =
      type === "employee"
        ? { type, name, id: empId, jobRole, status }
        : { type, name, email, contactNumber, status };

    onSubmit?.(payload);
  };

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <div className={styles.top}>
          <div className={styles.title}>Update User</div>
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
                  name="userTypeUpdate"
                  checked={type === "employee"}
                  onChange={() => setType("employee")}
                />
                <span>Employee</span>
              </label>

              <label className={styles.radio}>
                <input
                  type="radio"
                  name="userTypeUpdate"
                  checked={type === "customer"}
                  onChange={() => setType("customer")}
                />
                <span>Customer</span>
              </label>
            </div>
          </div>

          <div className={styles.block}>
            <div className={styles.label}>Name</div>
            <input className={styles.input} value={name} onChange={(e) => setName(e.target.value)} type="text" />
          </div>

          {type === "employee" ? (
            <>
              <div className={styles.block}>
                <div className={styles.label}>Id</div>
                <input className={styles.input} value={empId} onChange={(e) => setEmpId(e.target.value)} type="text" />
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
                <input className={styles.input} value={email} onChange={(e) => setEmail(e.target.value)} type="email" />
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
            <div className={styles.label}>Status</div>
            <select className={styles.select} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </div>

          <div className={styles.actions}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.primaryBtn}>
              Update User
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
