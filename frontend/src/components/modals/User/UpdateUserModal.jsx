import { useEffect, useState } from "react";
import styles from "./UpdateUserModal.module.css";
import Modal from "../../Modal/Modal.jsx";

export default function UpdateUserModal({
  open,
  onClose,
  onSubmit,
  initial, // pass from parent when opening (optional)
}) {
  const [type, setType] = useState("employee");

  const [name, setName] = useState("");
  const [empId, setEmpId] = useState("");
  const [jobRole, setJobRole] = useState("");

  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");

  const [status, setStatus] = useState("Inactive");

  useEffect(() => {
    if (!open) return;
    const init = initial || {
      type: "employee",
      name: "",
      id: "",
      jobRole: "",
      email: "",
      contactNumber: "",
      status: "Inactive",
    };

    setType(init.type || "employee");
    setName(init.name || "");
    setEmpId(init.id || "");
    setJobRole(init.jobRole || "");
    setEmail(init.email || "");
    setContactNumber(init.contactNumber || "");
    setStatus(init.status || "Inactive");
  }, [open, initial]);

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
    <Modal open={open} title="Update User" onClose={onClose} width={560}>
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
    </Modal>
  );
}
