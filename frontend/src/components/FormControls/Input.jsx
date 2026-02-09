import styles from './Input.module.css'

export default function Input({ label, required=false, ...props }) {
  return (
    <label className={styles.wrap}>
      <div className={styles.label}>
        {label} {required ? <span className={styles.req}>*</span> : null}
      </div>
      <input className={styles.input} {...props} />
    </label>
  )
}
