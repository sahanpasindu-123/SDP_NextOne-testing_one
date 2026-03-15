import styles from './Modal.module.css'
import { useEffect, useId } from 'react'
import { createPortal } from 'react-dom'

export default function Modal({ open, title, onClose, children, width=680 }) {
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  if (!open) return null
  return (
    createPortal(
      <div className={styles.backdrop} onMouseDown={onClose}>
        <div
          aria-labelledby={titleId}
          aria-modal="true"
          className={styles.modal}
          role="dialog"
          style={{ width }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className={styles.header}>
            <div className={styles.title} id={titleId}>{title}</div>
            <button className={styles.close} onClick={onClose} aria-label="Close">x</button>
          </div>
          <div className={styles.body}>{children}</div>
        </div>
      </div>,
      document.body,
    )
  )
}
