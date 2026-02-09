import styles from './StatCard.module.css'

export default function StatCard({ label, value, icon, iconTone='accent', sub=null }) {
  return (
    <div className={styles.card}>
      <div>
        <div className={styles.label}>{label}</div>
        <div className={styles.value}>{value}</div>
        {sub ? <div className={styles.sub}>{sub}</div> : null}
      </div>
      <div className={[styles.icon, styles[iconTone]].join(' ')}>
        {icon}
      </div>
    </div>
  )
}
