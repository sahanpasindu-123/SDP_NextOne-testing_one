import styles from "./InfoPage.module.css";

export default function TermsOfService() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Terms of Service</h1>
      <p className={styles.subtitle}>
        By using this portal, you agree to use it responsibly and provide
        accurate information.
      </p>

      <div className={styles.card}>
        <h2>Reservations</h2>
        <p>
          Reservations are subject to availability and may expire if not
          confirmed within the specified time.
        </p>

        <h2>Acceptable use</h2>
        <p>
          Do not attempt to misuse the portal, bypass restrictions, or interfere
          with other users.
        </p>
      </div>
    </div>
  );
}

