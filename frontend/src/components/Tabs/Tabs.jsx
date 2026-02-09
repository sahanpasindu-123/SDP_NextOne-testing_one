import styles from './Tabs.module.css'

export default function Tabs({ tabs, active, onChange }) {
  return (
    <div className={styles.tabs}>
      {tabs.map((t) => {
        const isActive = t.value === active
        return (
          <button
            key={t.value}
            className={[styles.tab, isActive ? styles.active : ''].join(' ')}
            onClick={() => onChange(t.value)}
            type="button"
          >
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
