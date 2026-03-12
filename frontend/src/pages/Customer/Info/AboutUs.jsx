import styles from "./InfoPage.module.css";

export default function AboutUs() {
  return (
    <div className={styles.page}>
      <h1 className={styles.title}>About Us</h1>
      <p className={styles.subtitle}>
        Liyanage Motors supplies genuine JCB spare parts with fast delivery and
        reliable support.
      </p>

      <div className={styles.card}>
        <h2>What we do</h2>
        <p>
          We help you find the right parts for your JCB machinery, check
          availability, and reserve items in minutes.
        </p>

        <h2>Why choose us</h2>
        <p>
          Quality parts, transparent availability, and friendly guidance from
          ordering to delivery.
        </p>
      </div>
    </div>
  );
}

