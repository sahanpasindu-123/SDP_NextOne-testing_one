import styles from "./InfoPage.module.css";
import { Link } from "react-router-dom";
import { FiCheckCircle, FiClock, FiMapPin, FiMail, FiPhone, FiSearch, FiShield } from "react-icons/fi";

export default function AboutUs() {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>About Us</h1>
        <p className={styles.subtitle}>
          We help you find the right parts, confirm availability, and reserve items quickly—so your equipment stays running with minimal downtime.
        </p>

        <div className={styles.ctaRow}>
          <Link className={styles.primaryBtn} to="/customer/catalog">
            Browse Catalog
          </Link>
          <Link className={styles.secondaryBtn} to="/customer/contact">
            Contact Support
          </Link>
        </div>
      </div>

      <div className={styles.grid2}>
        <div className={styles.card}>
          <h2>Who we are</h2>
          <p>
            We’re a customer-focused parts supplier using a modern inventory and reservation portal. Our goal is to make parts sourcing simple, transparent, and dependable—whether you are maintaining a single machine or managing a fleet.
          </p>

          <div className={styles.pills}>
            <span className={styles.pill}>Quality parts</span>
            <span className={styles.pill}>Reliable inventory</span>
            <span className={styles.pill}>Easy reservations</span>
            <span className={styles.pill}>Responsive support</span>
          </div>
        </div>

        <div className={styles.card}>
          <h2>Why customers trust us</h2>
          <ul className={styles.list}>
            <li>
              <FiCheckCircle />
              Clear availability and reservation status, so you can plan repairs confidently.
            </li>
            <li>
              <FiShield />
              Secure customer accounts and a portal designed for predictable, repeatable ordering.
            </li>
            <li>
              <FiClock />
              Fast, friendly help from inquiry to pickup—especially when a part is urgent.
            </li>
          </ul>
        </div>
      </div>

      <div className={styles.sectionHead}>
        <h2>What we do</h2>
        <p>
          Our portal is built around the real workflow of parts sourcing: find the right item, confirm stock, reserve it, and get help when needed.
        </p>
      </div>

      <div className={styles.grid3}>
        <div className={styles.feature}>
          <div className={styles.featureTop}>
            <div className={styles.featureIcon}>
              <FiSearch />
            </div>
            <h3>Searchable catalog</h3>
          </div>
          <p>Browse parts by product ID, name, or category with clean filtering and quick details.</p>
        </div>

        <div className={styles.feature}>
          <div className={styles.featureTop}>
            <div className={styles.featureIcon}>
              <FiCheckCircle />
            </div>
            <h3>Reserve in minutes</h3>
          </div>
          <p>Reserve items directly from the catalog and track your reservations in one place.</p>
        </div>

        <div className={styles.feature}>
          <div className={styles.featureTop}>
            <div className={styles.featureIcon}>
              <FiClock />
            </div>
            <h3>Reliable support</h3>
          </div>
          <p>Use the Contact page to message our team for part guidance, alternatives, or order help.</p>
        </div>
      </div>

      <div className={styles.sectionHead}>
        <h2>Mission & Vision</h2>
        <p>
          We keep things simple: dependable inventory, straightforward reservations, and support you can rely on.
        </p>
      </div>

      <div className={styles.grid2}>
        <div className={styles.card}>
          <h2>Mission</h2>
          <p>
            Provide a smooth, accurate way to source and reserve parts—backed by helpful communication and consistent service.
          </p>
        </div>

        <div className={styles.card}>
          <h2>Vision</h2>
          <p>
            Be the most trusted local partner for parts and inventory by making availability transparent and the ordering process effortless.
          </p>
        </div>
      </div>

      <div className={styles.sectionHead}>
        <h2>Contact information</h2>
        <p>Need help choosing a part or checking a reservation? Reach out and we’ll respond as quickly as possible.</p>
      </div>

      <div className={styles.card}>
        <div className={styles.contact}>
          <div className={styles.contactRow}>
            <FiMapPin />
            <span>Liyanage Motors, Padalangala Road, Sooriyawewa</span>
          </div>
          <div className={styles.contactRow}>
            <FiPhone />
            <a href="tel:+94755678900">+94 755678900</a>
          </div>
          <div className={styles.contactRow}>
            <FiMail />
            <a href="mailto:liyanagemotors12@gmail.com">liyanagemotors12@gmail.com</a>
          </div>
        </div>

        <div className={`${styles.ctaRow} ${styles.ctaRowLeft}`}>
          <Link className={styles.primaryBtn} to="/customer/contact">
            Send a message
          </Link>
        </div>
      </div>
    </div>
  );
}
