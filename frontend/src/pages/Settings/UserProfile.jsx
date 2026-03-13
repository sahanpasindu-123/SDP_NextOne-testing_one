import { useEffect, useRef, useState } from "react";
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
  const [role, setRole] = useState("Parts Manager");
  const [bio, setBio] = useState(
    "Parts manager with over 10 years of experience in JCB equipment and components."
  );

  const fileRef = useRef(null);
  const [photoUrl, setPhotoUrl] = useState("");

  const initials = `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();

  useEffect(() => {
    try {
      const raw = localStorage.getItem("userProfile");
      if (!raw) return;
      const p = JSON.parse(raw);

      if (typeof p.firstName === "string") setFirstName(p.firstName);
      if (typeof p.lastName === "string") setLastName(p.lastName);
      if (typeof p.email === "string") setEmail(p.email);
      if (typeof p.phone === "string") setPhone(p.phone);

      if (!isEmployee) {
        if (typeof p.role === "string") setRole(p.role);
        if (typeof p.bio === "string") setBio(p.bio);
        if (typeof p.photoUrl === "string") setPhotoUrl(p.photoUrl);
      }
    } catch {
      // ignore invalid localStorage
    }
  }, [isEmployee]);

  const handleChangePhoto = () => {
    fileRef.current?.click();
  };

  const handlePhotoSelected = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setPhotoUrl(url);
  };

  const handleRemovePhoto = () => {
    setPhotoUrl("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSaveChanges = () => {
    const payload = isEmployee
      ? { firstName, lastName, email, phone }
      : { firstName, lastName, email, phone, role, bio, photoUrl };
    localStorage.setItem("userProfile", JSON.stringify(payload));
    toast.success("Profile saved (stored locally on this device).");
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.title}>Profile</div>

      {!isEmployee && (
        <div className={styles.avatarRow}>
          <div className={styles.avatar}>
            {photoUrl ? (
              <img
                src={photoUrl}
                alt="Profile"
                style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "999px" }}
              />
            ) : (
              initials
            )}
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handlePhotoSelected}
          />

          <button className={styles.primaryMini} type="button" onClick={handleChangePhoto}>
            Change Photo
          </button>

          <button className={styles.ghostMini} type="button" onClick={handleRemovePhoto}>
            Remove
          </button>
        </div>
      )}

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

      {!isEmployee && (
        <>
          <div className={styles.block}>
            <div className={styles.label}>Role</div>
            <select className={styles.select} value={role} onChange={(e) => setRole(e.target.value)}>
              <option>Parts Manager</option>
              <option>Admin</option>
              <option>Employee</option>
            </select>
          </div>

          <div className={styles.block}>
            <div className={styles.label}>Bio</div>
            <textarea className={styles.textarea} value={bio} onChange={(e) => setBio(e.target.value)} />
          </div>
        </>
      )}

      <div className={styles.footer}>
        <button type="button" className={styles.saveBtn} onClick={handleSaveChanges}>
          <span className={styles.saveIco} />
          Save Changes
        </button>
      </div>
    </div>
  );
}
