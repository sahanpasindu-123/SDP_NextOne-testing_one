import styles from "./InfoPage.module.css";

export default function PrivacyPolicy() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Privacy Policy</h1>
      <p className={styles.subtitle}>
        This page explains how we handle your information when you use the
        customer portal.
      </p>

      <div className={styles.card}>
        <h2>Data we use</h2>
        <p>
          We use account and reservation details to provide portal features such
          as sign-in, profile management, and reservations.
        </p>

        <h2>Security</h2>
        <p>
          We take reasonable measures to protect your information. Avoid sharing
          your password and sign out on shared devices.
        </p>
      </div>
    </div>
  );
}

