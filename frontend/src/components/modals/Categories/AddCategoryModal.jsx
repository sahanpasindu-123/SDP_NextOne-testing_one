import { useEffect, useState } from "react";
import styles from "./AddCategoryModal.module.css";
import Button from "../../Button/Button";
import Modal from "../../Modal/Modal.jsx";

export default function AddCategoryModal({
  open,
  onClose,
  onSubmit,
  loading,
  title = "Add Category",
  initialName = "",
  submitLabel = "Save",
}) {
  const [name, setName] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(String(initialName || ""));
  }, [open, initialName]);

  if (!open) return null;

  const handleSubmit = () => {
    if (!name.trim()) return;
    onSubmit(name.trim());
  };

  return (
    <Modal open={open} title={title} onClose={onClose} width={520}>
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.title}>{title}</div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <div className={styles.body}>
          <label className={styles.label}>Category Name</label>
          <input
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Engine Parts"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSubmit();
            }}
            disabled={loading}
            autoFocus
          />
        </div>

        <div className={styles.footer}>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !name.trim()}>
            {submitLabel}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
