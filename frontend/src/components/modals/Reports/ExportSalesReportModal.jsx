import styles from "./ExportSalesReportModal.module.css";
import Modal from "../../Modal/Modal.jsx";

export default function ExportSalesReportModal({
  open,
  onClose,
  onExport,
  timePeriod,
  setTimePeriod,
  reportType,
  setReportType,
}) {
  if (!open) return null;

  const handleExport = () => {
    onExport?.({ timePeriod, reportType });
  };

  return (
    <Modal open={open} title="Export Sales Report" onClose={onClose} width={560}>
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <div className={styles.top}>
          <div className={styles.title}>Export Sales Report</div>
          <button className={styles.close} type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className={styles.body}>
          <div className={styles.block}>
            <div className={styles.label}>Time Period</div>
            <select
              className={styles.select}
              value={timePeriod}
              onChange={(e) => setTimePeriod(e.target.value)}
            >
              <option>Last 7 Days</option>
              <option>Last 30 Days</option>
              <option>Last 3 Months</option>
              <option>Last 6 Months</option>
              <option>Custom</option>
            </select>
          </div>

          <div className={styles.block}>
            <div className={styles.label}>Report Type</div>
            <select
              className={styles.select}
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
            >
              <option>Detailed Report</option>
              <option>Summary Report</option>
              <option>CSV Export</option>
              <option>PDF Export</option>
            </select>
          </div>
        </div>

        <div className={styles.actions}>
          <button className={styles.cancelBtn} type="button" onClick={onClose}>
            Cancel
          </button>
          <button className={styles.exportBtn} type="button" onClick={handleExport}>
            Export
          </button>
        </div>
      </div>
    </Modal>
  );
}
