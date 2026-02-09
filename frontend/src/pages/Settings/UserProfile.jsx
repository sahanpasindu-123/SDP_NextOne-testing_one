import { useRef, useState } from "react";
import styles from "./UserProfile.module.css";

export default function UserProfile() {
  const [firstName, setFirstName] = useState("John");
  const [lastName, setLastName] = useState("Smith");
  const [email, setEmail] = useState("john.smith@jcbparts.com");
  const [phone, setPhone] = useState("+91 98765 43210");
  const [role, setRole] = useState("Parts Manager");
  const [bio, setBio] = useState(
    "Parts manager with over 10 years of experience in JCB equipment and components."
  );

    const fileRef = useRef(null);
  const [photoUrl, setPhotoUrl] = useState("");

  const initials = `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();

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
    const payload = { firstName, lastName, email, phone, role, bio, photoUrl };
    localStorage.setItem("userProfile", JSON.stringify(payload));
    alert("Saved changes (stored locally).");
  };


  return (
    <div className={styles.wrap}>
      <div className={styles.title}>User Profile</div>

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

        <button
          className={styles.primaryMini}
          type="button"
          onClick={handleChangePhoto}
        >
          Change Photo
        </button>

        <button
          className={styles.ghostMini}
          type="button"
          onClick={handleRemovePhoto}
        >
          Remove
        </button>
      </div>


      <div className={styles.grid2}>
        <div className={styles.block}>
          <div className={styles.label}>First Name</div>
          <input className={styles.input} value={firstName} onChange={(e)=>setFirstName(e.target.value)} />
        </div>

        <div className={styles.block}>
          <div className={styles.label}>Last Name</div>
          <input className={styles.input} value={lastName} onChange={(e)=>setLastName(e.target.value)} />
        </div>

        <div className={styles.block}>
          <div className={styles.label}>Email Address</div>
          <input className={styles.input} value={email} onChange={(e)=>setEmail(e.target.value)} />
        </div>

        <div className={styles.block}>
          <div className={styles.label}>Phone Number</div>
          <input className={styles.input} value={phone} onChange={(e)=>setPhone(e.target.value)} />
        </div>
      </div>

      <div className={styles.block}>
        <div className={styles.label}>Role</div>
        <select className={styles.select} value={role} onChange={(e)=>setRole(e.target.value)}>
          <option>Parts Manager</option>
          <option>Admin</option>
          <option>Employee</option>
        </select>
      </div>

      <div className={styles.block}>
        <div className={styles.label}>Bio</div>
        <textarea className={styles.textarea} value={bio} onChange={(e)=>setBio(e.target.value)} />
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
