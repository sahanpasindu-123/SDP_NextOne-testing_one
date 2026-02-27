import styles from './Modal.module.css'

export default function Modal({ open, title, onClose, children, width=680 }) {
  if (!open) return null
  return (
    <div className={styles.backdrop} onMouseDown={onClose}>
      <div className={styles.modal} style={{ width }} onMouseDown={(e)=>e.stopPropagation()}>
        <div className={styles.header}>
          <div className={styles.title}>{title}</div>
          <button className={styles.close} onClick={onClose} aria-label="Close">x</button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  )
}
