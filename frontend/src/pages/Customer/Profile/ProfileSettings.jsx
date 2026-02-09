import { useEffect, useState } from 'react'
import styles from './ProfileSettings.module.css'

export default function ProfileSettings() {
  // -------- Local state (implemented) --------
  const [fullName, setFullName] = useState("Sahan Pasindu")
  const [email, setEmail] = useState("sahanpasindu@gmail.com")
  const [phone, setPhone] = useState("+94 77 123 4567")
  const [address, setAddress] = useState("Sooriyawewa, Sri Lanka")

  const [currentPw, setCurrentPw] = useState("")
  const [newPw, setNewPw] = useState("")
  const [confirmPw, setConfirmPw] = useState("")

  // Load saved profile (if exists)
  useEffect(() => {
    try {
      const raw = localStorage.getItem("customerProfileSettings")
      if (!raw) return
      const data = JSON.parse(raw)
      setFullName(data.fullName ?? fullName)
      setEmail(data.email ?? email)
      setPhone(data.phone ?? phone)
      setAddress(data.address ?? address)
    } catch {
      // ignore invalid local storage
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSaveProfile = () => {
    if (!fullName.trim()) return alert("Full Name is required.")
    if (!email.trim()) return alert("Email is required.")

    const payload = { fullName, email, phone, address }
    localStorage.setItem("customerProfileSettings", JSON.stringify(payload))
    alert("Saved changes (stored locally).")
  }

  const handleUpdatePassword = () => {
    if (!currentPw || !newPw || !confirmPw) return alert("Please fill all password fields.")
    if (newPw.length < 6) return alert("New password must be at least 6 characters.")
    if (newPw !== confirmPw) return alert("New password and confirm password do not match.")

    // No backend endpoint exists in this project yet — safe implementation for completion:
    setCurrentPw("")
    setNewPw("")
    setConfirmPw("")
    alert("Password updated (UI-only). Backend can be wired later.")
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Profile Settings</h1>
        <p>Manage your personal details and password.</p>
      </div>

      <div className={styles.grid}>
        <div className={styles.card}>
          <div className={styles.title}>Personal Information</div>

          <div className={styles.form}>
            <label>
              <span>Full Name</span>
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </label>
            <label>
              <span>Email</span>
              <input value={email} onChange={(e) => setEmail(e.target.value)} />
            </label>
            <label>
              <span>Phone</span>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </label>
            <label>
              <span>Address</span>
              <input value={address} onChange={(e) => setAddress(e.target.value)} />
            </label>

            <button className={styles.save} type="button" onClick={handleSaveProfile}>
              Save Changes
            </button>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.title}>Change Password</div>

          <div className={styles.form}>
            <label>
              <span>Current Password</span>
              <input
                type="password"
                placeholder="••••••••"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
              />
            </label>
            <label>
              <span>New Password</span>
              <input
                type="password"
                placeholder="••••••••"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
              />
            </label>
            <label>
              <span>Confirm Password</span>
              <input
                type="password"
                placeholder="••••••••"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
              />
            </label>

            <button className={styles.save} type="button" onClick={handleUpdatePassword}>
              Update Password
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
