import styles from "./DeleteUserModal.module.css";
import Modal from "../../Modal/Modal.jsx";

export default function DeleteUserModal({
  open,
  onClose,
  onDelete,
  userName = "",
}) {
  if (!open) return null;

  return (
    <Modal open={open} title="Delete User" onClose={onClose} width={520}>
      <div className={styles.inner}>
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
    </Modal>
  );
}
