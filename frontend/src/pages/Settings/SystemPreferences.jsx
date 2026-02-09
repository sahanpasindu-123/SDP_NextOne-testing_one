import { useEffect, useState } from 'react'
import { FiSave } from 'react-icons/fi'
import styles from './SystemPreferences.module.css'

function Toggle({ checked, onToggle, label }) {
  return (
    <div
      role="switch"
      aria-checked={checked}
      aria-label={label}
      tabIndex={0}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onToggle()
      }}
      className={`${styles.toggle} ${checked ? styles.on : ''}`}
      style={{ cursor: 'pointer' }}
    >
      <div className={styles.knob} />
    </div>
  )
}


export default function SystemPreferences() {

    const [darkMode, setDarkMode] = useState(false)
  const [compactMode, setCompactMode] = useState(true)
  const [autoSave, setAutoSave] = useState(true)
  const [confirmBeforeDelete, setConfirmBeforeDelete] = useState(true)

  const [language, setLanguage] = useState('English')
  const [currency, setCurrency] = useState('Srilankan Rupees')
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY')
  const [timeFormat, setTimeFormat] = useState('12-hour (AM/PM)')

  // load saved prefs
  useEffect(() => {
    try {
      const raw = localStorage.getItem('systemPreferences')
      if (!raw) return
      const p = JSON.parse(raw)

      if (typeof p.darkMode === 'boolean') setDarkMode(p.darkMode)
      if (typeof p.compactMode === 'boolean') setCompactMode(p.compactMode)
      if (typeof p.autoSave === 'boolean') setAutoSave(p.autoSave)
      if (typeof p.confirmBeforeDelete === 'boolean') setConfirmBeforeDelete(p.confirmBeforeDelete)

      if (typeof p.language === 'string') setLanguage(p.language)
      if (typeof p.currency === 'string') setCurrency(p.currency)
      if (typeof p.dateFormat === 'string') setDateFormat(p.dateFormat)
      if (typeof p.timeFormat === 'string') setTimeFormat(p.timeFormat)
    } catch {
      // ignore invalid saved data
    }
  }, [])

  const persist = () => {
    const payload = {
      darkMode,
      compactMode,
      autoSave,
      confirmBeforeDelete,
      language,
      currency,
      dateFormat,
      timeFormat,
    }
    localStorage.setItem('systemPreferences', JSON.stringify(payload))
  }

  const handleSave = () => {
    persist()
    alert('System preferences saved (stored locally).')
  }

  // optional: auto-save when enabled
  useEffect(() => {
    if (!autoSave) return
    persist()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [darkMode, compactMode, autoSave, confirmBeforeDelete, language, currency, dateFormat, timeFormat])

  return (
    <>
      <div className={styles.rightHead}>System Preferences</div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Display Settings</div>

        <div className={styles.row}>
          <div>
            <div className={styles.rowTitle}>Dark Mode</div>
            <div className={styles.rowSub}>Enable dark mode for the interface</div>
          </div>
          <Toggle
            checked={darkMode}
            onToggle={() => setDarkMode((v) => !v)}
            label="Dark Mode"
          />
        </div>

        <div className={styles.row}>
          <div>
            <div className={styles.rowTitle}>Compact Mode</div>
            <div className={styles.rowSub}>Show more content with reduced spacing</div>
          </div>
          <Toggle
            checked={compactMode}
            onToggle={() => setCompactMode((v) => !v)}
            label="Compact Mode"
          />
        </div>
      </div>

      <div className={styles.divider} />

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Regional Settings</div>

        <div className={styles.form2}>
          <label>
            <div className={styles.lbl}>Language</div>
            <select className={styles.sel} value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option>English</option>
              <option>Sinhala</option>
            </select>
          </label>
          <label>
            <div className={styles.lbl}>Currency</div>
            <select className={styles.sel}>
              <option>Srilankan Rupees</option>
              <option>USD</option>
            </select>
          </label>

          <label>
            <div className={styles.lbl}>Date Format</div>
            <select className={styles.sel}>
              <option>DD/MM/YYYY</option>
              <option>MM/DD/YYYY</option>
            </select>
          </label>
          <label>
            <div className={styles.lbl}>Time Format</div>
            <select className={styles.sel}>
              <option>12-hour (AM/PM)</option>
              <option>24-hour</option>
            </select>
          </label>
        </div>
      </div>

      <div className={styles.divider} />

      <div className={styles.section}>
        <div className={styles.sectionTitle}>System Behavior</div>

        <div className={styles.row}>
          <div>
            <div className={styles.rowTitle}>Auto-save Changes</div>
            <div className={styles.rowSub}>Automatically save changes while editing</div>
          </div>
          <Toggle
            checked={autoSave}
            onToggle={() => setAutoSave((v) => !v)}
            label="Auto-save Changes"
          />
        </div>

        <div className={styles.row}>
          <div>
            <div className={styles.rowTitle}>Confirm Before Delete</div>
            <div className={styles.rowSub}>Show confirmation dialog before deleting items</div>
          </div>
                    <Toggle
            checked={confirmBeforeDelete}
            onToggle={() => setConfirmBeforeDelete((v) => !v)}
            label="Confirm Before Delete"
          />

        </div>
      </div>

      <div className={styles.saveRow}>
        <button className={styles.saveBtn} type="button" onClick={handleSave}>
          <FiSave /> Save Changes
        </button>
      </div>
    </>
  )
}
