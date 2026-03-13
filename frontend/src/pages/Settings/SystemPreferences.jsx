import { useEffect, useMemo, useState } from 'react'
import { FiSave } from 'react-icons/fi'
import styles from './SystemPreferences.module.css'
import { useAuth } from "../../context/AuthContext";

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
  const { role } = useAuth();
  const normalizedRole = String(role || "").trim().toUpperCase();
  const isEmployee = normalizedRole === "EMPLOYEE";

  const [loaded, setLoaded] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [compactMode, setCompactMode] = useState(true)
  const [autoSave, setAutoSave] = useState(true)
  const [confirmBeforeDelete, setConfirmBeforeDelete] = useState(true)

  const [language, setLanguage] = useState('English')
  const [currency, setCurrency] = useState('Srilankan Rupees')
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY')
  const [timeFormat, setTimeFormat] = useState('12-hour (AM/PM)')

  const safeLanguage = useMemo(() => {
    return language === "Sinhala" ? "Sinhala" : "English";
  }, [language]);

  // Apply theme + language globally
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = darkMode ? "dark" : "light";
    root.style.colorScheme = darkMode ? "dark" : "light";
    root.lang = safeLanguage === "Sinhala" ? "si" : "en";
  }, [darkMode, safeLanguage]);

  // load saved prefs
  useEffect(() => {
    try {
      const raw = localStorage.getItem('systemPreferences')
      if (!raw) return
      const p = JSON.parse(raw)

      if (typeof p.darkMode === 'boolean') setDarkMode(p.darkMode)
      if (!isEmployee) {
        if (typeof p.compactMode === 'boolean') setCompactMode(p.compactMode)
        if (typeof p.autoSave === 'boolean') setAutoSave(p.autoSave)
        if (typeof p.confirmBeforeDelete === 'boolean') setConfirmBeforeDelete(p.confirmBeforeDelete)
      }

      if (typeof p.language === 'string') setLanguage(p.language)
      if (!isEmployee) {
        if (typeof p.currency === 'string') setCurrency(p.currency)
        if (typeof p.dateFormat === 'string') setDateFormat(p.dateFormat)
        if (typeof p.timeFormat === 'string') setTimeFormat(p.timeFormat)
      }
    } catch {
      // ignore invalid saved data
    } finally {
      setLoaded(true)
    }
  }, [isEmployee])

  const persist = () => {
    const payload = isEmployee
      ? { darkMode, language: safeLanguage }
      : {
          darkMode,
          compactMode,
          autoSave,
          confirmBeforeDelete,
          language: safeLanguage,
          currency,
          dateFormat,
          timeFormat,
        }
    if (isEmployee) {
      // Avoid wiping admin-only keys if a device is shared.
      let existing = {}
      try {
        existing = JSON.parse(localStorage.getItem('systemPreferences') || '{}') || {}
      } catch {
        existing = {}
      }
      localStorage.setItem('systemPreferences', JSON.stringify({ ...existing, ...payload }))
      return
    }
    localStorage.setItem('systemPreferences', JSON.stringify(payload))
  }

  const handleSave = () => {
    persist()
    alert('Preferences saved (stored locally on this device).')
  }

  // Employee: persist immediately (no extra toggles / no autosave UI)
  useEffect(() => {
    if (!isEmployee) return
    if (!loaded) return
    persist()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmployee, loaded, darkMode, safeLanguage])

  // optional: auto-save when enabled
  useEffect(() => {
    if (isEmployee) return
    if (!loaded) return
    if (!autoSave) return
    persist()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [darkMode, compactMode, autoSave, confirmBeforeDelete, language, currency, dateFormat, timeFormat])

  return (
    <>
      <div className={styles.rightHead}>{isEmployee ? "Preferences" : "System Preferences"}</div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Display</div>

        <div className={styles.row}>
          <div>
            <div className={styles.rowTitle}>Dark Mode</div>
            <div className={styles.rowSub}>Turn dark mode on or off</div>
          </div>
          <Toggle
            checked={darkMode}
            onToggle={() => setDarkMode((v) => !v)}
            label="Dark Mode"
          />
        </div>

        {!isEmployee && (
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
        )}
      </div>

      <div className={styles.divider} />

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Language</div>

        <div className={styles.form2} style={isEmployee ? { gridTemplateColumns: "1fr" } : undefined}>
          <label>
            <div className={styles.lbl}>Language</div>
            <select className={styles.sel} value={safeLanguage} onChange={(e) => setLanguage(e.target.value)}>
              <option>English</option>
              <option>Sinhala</option>
            </select>
          </label>

          {!isEmployee && (
            <>
              <label>
                <div className={styles.lbl}>Currency</div>
                <select className={styles.sel} value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  <option>Srilankan Rupees</option>
                  <option>USD</option>
                </select>
              </label>

              <label>
                <div className={styles.lbl}>Date Format</div>
                <select className={styles.sel} value={dateFormat} onChange={(e) => setDateFormat(e.target.value)}>
                  <option>DD/MM/YYYY</option>
                  <option>MM/DD/YYYY</option>
                </select>
              </label>

              <label>
                <div className={styles.lbl}>Time Format</div>
                <select className={styles.sel} value={timeFormat} onChange={(e) => setTimeFormat(e.target.value)}>
                  <option>12-hour (AM/PM)</option>
                  <option>24-hour</option>
                </select>
              </label>
            </>
          )}
        </div>
      </div>

      {!isEmployee && (
        <>
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
        </>
      )}

      <div className={styles.saveRow}>
        <button className={styles.saveBtn} type="button" onClick={handleSave}>
          <FiSave /> Save Changes
        </button>
      </div>
    </>
  )
}
