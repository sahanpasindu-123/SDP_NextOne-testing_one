import { useEffect, useState, useRef } from "react";
import ToggleSwitch from "../../components/ui/ToggleSwitch";
import styles from "./BackupData.module.css";
import toast from "react-hot-toast";
import Modal from "../../components/Modal/Modal";
import Button from "../../components/Button/Button";

import {
  createBackup,
  listBackups,
  restoreBackup,
  exportData,
  downloadBackup,
} from "../../api/settings";

export default function BackupData() {
  const isMountedRef = useRef(true);
  const [auto, setAuto] = useState(true);
  const [freq, setFreq] = useState("Daily (at midnight)");
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState(null);

  // Load backups on page load
  useEffect(() => {
    isMountedRef.current = true;
    loadBackups();
    return () => {
      isMountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadBackups = async () => {
    try {
      const res = await listBackups();
      // Supports: {data: [...] } OR direct array return
      const data = Array.isArray(res) ? res : res?.data;
      if (!isMountedRef.current) return;
      setBackups(data || []);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load backups");
    }
  };

  // Create backup
  const handleCreateBackup = async () => {
    try {
      setLoading(true);
      await createBackup();
      toast.success("Backup created successfully");
      await loadBackups();
    } catch (err) {
      console.error(err);
      toast.error("Backup failed");
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  // Download backup file
  const handleDownloadBackup = async (fileName) => {
    try {
      await downloadBackup(fileName);
    } catch (err) {
      console.error(err);
      toast.error("Download failed");
    }
  };

  // Restore backup
  const handleRestoreBackup = async (fileName) => {
    setRestoreTarget(fileName);
  };

  const confirmRestoreBackup = async () => {
    const fileName = restoreTarget;
    if (!fileName) return;

    try {
      setLoading(true);
      await restoreBackup(fileName);
      toast.success("Backup restored successfully");
      setRestoreTarget(null);
    } catch (err) {
      console.error(err);
      toast.error("Restore failed");
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  // Export data (supports both: response-returning OR direct-download implementations)
  const handleExport = async (type) => {
    try {
      const res = await exportData(type);

      // ✅ If exportData already triggers a download (and returns nothing), just finish.
      if (!res) return;

      // ✅ If exportData returns axios-like response { data, headers }
      const content = res?.data ?? res;
      const blob =
        content instanceof Blob
          ? content
          : new Blob([content], { type: "application/octet-stream" });

      const url = window.URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;

      // map type -> extension
      const ext =
        type === "excel" ? "xlsx" : type === "pdf" ? "pdf" : type === "csv" ? "csv" : type;

      a.download = `data.${ext}`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      toast.error("Export failed");
    }
  };

  return (
    <div className={styles.wrap}>
      <div className={styles.title}>Backup &amp; Data</div>

      {/* Automated backup */}
      <div className={styles.sectionTitle}>Automated Backups</div>

      <div className={styles.row}>
        <div>
          <div className={styles.rowTitle}>Enable Automated Backups</div>
          <div className={styles.rowSub}>
            System will automatically backup your data
          </div>
        </div>
        <ToggleSwitch checked={auto} onChange={setAuto} />
      </div>

      <div className={styles.block}>
        <div className={styles.label}>Backup Frequency</div>
        <select
          className={styles.select}
          value={freq}
          onChange={(e) => setFreq(e.target.value)}
        >
          <option>Daily (at midnight)</option>
          <option>Weekly</option>
          <option>Monthly</option>
        </select>
      </div>

      {/* Manual backup */}
      <div className={styles.sectionTitle}>Manual Backup</div>
      <div className={styles.help}>
        Create a manual backup of your entire inventory database.
      </div>

      <button
        type="button"
        className={styles.primaryBtn}
        onClick={handleCreateBackup}
        disabled={loading}
      >
        {loading ? "Creating..." : "Create Backup Now"}
      </button>

      {/* Recent backups */}
      <div className={styles.sectionTitle} style={{ marginTop: 22 }}>
        Recent Backups
      </div>

      <div className={styles.table}>
        <div className={styles.tHead}>
          <div>File</div>
          <div>Actions</div>
        </div>

        {backups.length === 0 && (
          <div className={styles.tRow}>
            <div>No backups found</div>
          </div>
        )}

        {backups.map((b, i) => {
          const fileName = b?.name || b;
          return (
            <div key={fileName || i} className={styles.tRow}>
              <div>{fileName}</div>
              <div className={styles.links}>
                <button
                  type="button"
                  className={styles.linkBtn}
                  onClick={() => handleDownloadBackup(fileName)}
                >
                  Download
                </button>
                <button
                  type="button"
                  className={styles.linkBtn}
                  onClick={() => handleRestoreBackup(fileName)}
                >
                  Restore
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Export */}
      <div className={styles.sectionTitle} style={{ marginTop: 22 }}>
        Data Export
      </div>

      <div className={styles.help}>
        Export your inventory data in various formats.
      </div>

      <div className={styles.exportRow}>
        <button
          className={styles.outlineBtn}
          type="button"
          onClick={() => handleExport("excel")}
        >
          Export as Excel
        </button>

        <button
          className={styles.outlineBtn}
          type="button"
          onClick={() => handleExport("csv")}
        >
          Export as CSV
        </button>

        <button
          className={styles.outlineBtn}
          type="button"
          onClick={() => handleExport("pdf")}
        >
          Export as PDF
        </button>

        <button
          className={styles.outlineBtn}
          type="button"
          onClick={() => handleExport("json")}
        >
          Export as JSON
        </button>
      </div>

      <Modal
        open={!!restoreTarget}
        title="Restore Backup"
        onClose={() => setRestoreTarget(null)}
        width={520}
      >
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ color: "#334155", fontWeight: 700 }}>
            Restore backup <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace" }}>{restoreTarget}</span>?
          </div>
          <div style={{ color: "#64748b", fontSize: 13 }}>
            This will overwrite current data with the selected backup.
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 6 }}>
            <Button variant="secondary" onClick={() => setRestoreTarget(null)} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={confirmRestoreBackup} disabled={loading}>
              {loading ? "Restoring..." : "Restore"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
