import styles from './Tabs.module.css'

export default function Tabs({ tabs, active, onChange }) {
  const safeTabs = Array.isArray(tabs) ? tabs : []
  const handleChange = typeof onChange === 'function' ? onChange : null

  return (
    <div className={styles.tabs}>
      {safeTabs.map((t, idx) => {
        const value = t?.value ?? idx
        const isActive = value === active
        return (
          <button
            key={value}
            className={[styles.tab, isActive ? styles.active : ''].join(' ')}
            onClick={() => handleChange?.(value)}
            type="button"
          >
            {t?.label ?? ''}
          </button>
        )
      })}
    </div>
  )
}
