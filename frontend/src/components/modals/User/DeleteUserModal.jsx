import styles from "./DeleteUserModal.module.css";

export default function DeleteUserModal({
  open,
  onClose,
  onDelete,
  userName = "",
}) {
  if (!open) return null;

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div className={styles.modal} onMouseDown={(e) => e.stopPropagation()}>
        <div className={styles.top}>
          <div className={styles.title}>Delete User</div>
          <button className={styles.close} type="button" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className={styles.iconWrap}>
          <div className={styles.icon}>!</div>
        </div>

        <div className={styles.msg}>Are you sure you want to delete this user?</div>

        {userName ? <div className={styles.name}>{userName}</div> : null}

        <div className={styles.sub}>This action cannot be undone.</div>

        <div className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button type="button" className={styles.deleteBtn} onClick={onDelete}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
