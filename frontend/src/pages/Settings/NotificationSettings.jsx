import { useEffect, useState } from "react";
import ToggleSwitch from "../../components/ui/ToggleSwitch";
import styles from "./NotificationSettings.module.css";

export default function NotificationSettings() {
  const [lowStock, setLowStock] = useState(true);
  const [reserveConfirm, setReserveConfirm] = useState(true);
  const [desktop, setDesktop] = useState(true);
  const [sound, setSound] = useState(false);
  const [digest, setDigest] = useState("Real-time");

    // -------- Persist / Save (implemented) --------
  useEffect(() => {
    try {
      const raw = localStorage.getItem("notificationSettings");
      if (!raw) return;
      const s = JSON.parse(raw);

      if (typeof s.lowStock === "boolean") setLowStock(s.lowStock);
      if (typeof s.reserveConfirm === "boolean") setReserveConfirm(s.reserveConfirm);
      if (typeof s.desktop === "boolean") setDesktop(s.desktop);
      if (typeof s.sound === "boolean") setSound(s.sound);
      if (typeof s.digest === "string") setDigest(s.digest);
    } catch {
      // ignore invalid localStorage
    }
  }, []);

  const handleSave = async () => {
    const payload = { lowStock, reserveConfirm, desktop, sound, digest };
    localStorage.setItem("notificationSettings", JSON.stringify(payload));

    // Optional: if desktop notifications enabled, request permission
    try {
      if (desktop && typeof Notification !== "undefined" && Notification.permission === "default") {
        await Notification.requestPermission();
      }
    } catch {
      // ignore permission errors
    }

    alert("Notification settings saved (stored locally).");
  };


  return (
    <div className={styles.wrap}>
      <div className={styles.title}>Notification Settings</div>

      <div className={styles.sectionTitle}>Email Notifications</div>

      <div className={styles.row}>
        <div>
          <div className={styles.rowTitle}>Low Stock Alerts</div>
          <div className={styles.rowSub}>Receive emails when items reach low stock threshold</div>
        </div>
        <ToggleSwitch checked={lowStock} onChange={setLowStock} />
      </div>

      <div className={styles.row}>
        <div>
          <div className={styles.rowTitle}>Reservation Confirmations</div>
          <div className={styles.rowSub}>Receive emails when new orders are placed</div>
        </div>
        <ToggleSwitch checked={reserveConfirm} onChange={setReserveConfirm} />
      </div>

      <div className={styles.sectionTitle}>System Notifications</div>

      <div className={styles.row}>
        <div>
          <div className={styles.rowTitle}>Desktop Notifications</div>
          <div className={styles.rowSub}>Show desktop notifications for important alerts</div>
        </div>
        <ToggleSwitch checked={desktop} onChange={setDesktop} />
      </div>

      <div className={styles.row}>
        <div>
          <div className={styles.rowTitle}>Sound Alerts</div>
          <div className={styles.rowSub}>Play sound when notifications arrive</div>
        </div>
        <ToggleSwitch checked={sound} onChange={setSound} />
      </div>

      <div className={styles.sectionTitle}>Notification Frequency</div>

      <div className={styles.block}>
        <div className={styles.label}>Digest Email Frequency</div>
        <select className={styles.select} value={digest} onChange={(e)=>setDigest(e.target.value)}>
          <option>Real-time</option>
          <option>Daily</option>
          <option>Weekly</option>
        </select>
      </div>

      <div className={styles.footer}>
        <button type="button" className={styles.saveBtn} onClick={handleSave}>
          <span className={styles.saveIco} />
          Save Changes
        </button>
      </div>
    </div>
  );
}
