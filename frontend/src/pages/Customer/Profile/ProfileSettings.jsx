import { useEffect, useState } from 'react'
import styles from './ProfileSettings.module.css'
import { customersAPI } from "../../../api/customers";
import toast from "react-hot-toast";

export default function ProfileSettings() {
  // -------- Local state (implemented) --------
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [saving, setSaving] = useState(false)
  const [pwSaving, setPwSaving] = useState(false)

  const [currentPw, setCurrentPw] = useState("")
  const [newPw, setNewPw] = useState("")
  const [confirmPw, setConfirmPw] = useState("")

  // Load saved address (local-only) + hydrate profile from backend
  useEffect(() => {
    let cancelled = false

    try {
      const raw = localStorage.getItem("customerProfileSettings")
      if (raw) {
        const data = JSON.parse(raw)
        if (!cancelled) {
          setAddress(data?.address ?? "")
        }
      }
    } catch {
      // ignore invalid local storage
    }

    async function hydrate() {
      try {
        const res = await customersAPI.getMe()
        if (!res?.success || !res?.data) return
        if (cancelled) return

        setFullName(String(res.data.Name || ""))
        setEmail(String(res.data.Email || ""))
        setPhone(String(res.data.Phone || ""))
      } catch (e) {
        // Keep page usable even if backend is temporarily unavailable
        console.warn("Profile hydrate failed:", e?.message || e)
      }
    }

    hydrate()

    return () => {
      cancelled = true
    }
  }, [])

  const handleSaveProfile = async () => {
    if (!fullName.trim()) return toast.error("Full Name is required.")
    if (!email.trim()) return toast.error("Email is required.")

    setSaving(true)
    try {
      const res = await customersAPI.updateMe({
        name: fullName,
        email,
        phone,
      })

      if (!res?.success) {
        toast.error(res?.message || "Failed to save changes.")
        return
      }

      const updated = res?.data || {}
      setFullName(String(updated.Name || fullName))
      setEmail(String(updated.Email || email))
      setPhone(String(updated.Phone || phone))

      // Address is not persisted in the current backend schema; keep it local-only.
      localStorage.setItem("customerProfileSettings", JSON.stringify({ address }))

      toast.success(res?.message || "Saved changes.")
    } catch (e) {
      toast.error(e?.message || "Failed to save changes.")
    } finally {
      setSaving(false)
    }
  }

  const handleUpdatePassword = async () => {
    if (!currentPw || !newPw || !confirmPw) return toast.error("Please fill all password fields.")
    if (newPw.length < 8) return toast.error("New password must be at least 8 characters.")
    if (newPw !== confirmPw) return toast.error("New password and confirm password do not match.")

    setPwSaving(true)
    try {
      const res = await customersAPI.changeMyPassword({
        currentPassword: currentPw,
        newPassword: newPw,
      })

      if (!res?.success) {
        toast.error(res?.message || "Password update failed")
        return
      }

      setCurrentPw("")
      setNewPw("")
      setConfirmPw("")
      toast.success(res?.message || "Password updated successfully")
    } catch (e) {
      toast.error(e?.message || "Password update failed")
    } finally {
      setPwSaving(false)
    }
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

            <button className={styles.save} type="button" onClick={handleSaveProfile} disabled={saving}>
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

            <button className={styles.save} type="button" onClick={handleUpdatePassword} disabled={pwSaving}>
              Update Password
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
