import styles from './Select.module.css'

export default function Select({ label, required=false, children, ...props }) {
  return (
    <label className={styles.wrap}>
      <div className={styles.label}>
        {label} {required ? <span className={styles.req}>*</span> : null}
      </div>
      <select className={styles.select} {...props}>{children}</select>
    </label>
  )
}
