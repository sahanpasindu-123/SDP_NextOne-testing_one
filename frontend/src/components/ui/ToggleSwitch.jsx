import styles from "./ToggleSwitch.module.css";

export default function ToggleSwitch({ checked, onChange }) {
  return (
    <button
      type="button"
      className={`${styles.switch} ${checked ? styles.on : ""}`}
      onClick={() => onChange?.(!checked)}
      aria-pressed={checked}
    >
      <span className={styles.knob} />
    </button>
  );
}
