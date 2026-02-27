import { useMemo } from "react";
import { Link } from "react-router-dom";
import { FiMapPin, FiPhone, FiMail } from 'react-icons/fi'
import styles from './CustomerFooter.module.css'
import { useCategories } from "../../context/CategoriesContext.jsx";

export default function CustomerFooter() {
  const { categories } = useCategories();

  const nameToId = useMemo(() => {
    const map = new Map();
    (Array.isArray(categories) ? categories : []).forEach((c) => {
      const n = String(c?.Name || "").trim().toLowerCase();
      if (n && c?.CategoryID != null) map.set(n, c.CategoryID);
    });
    return map;
  }, [categories]);

  const categoryLink = (name) => {
    const cleanName = String(name || "").trim();
    const id = nameToId.get(cleanName.toLowerCase());
    if (id != null) return `/customer/catalog?categoryId=${encodeURIComponent(String(id))}`;
    return `/customer/catalog?category=${encodeURIComponent(cleanName)}`;
  };

  return (
    <footer className={styles.footer}>
      <div className={styles.grid}>
        <div>
          <div className={styles.title}>JCB Parts</div>
          <div className={styles.p}>
            Your trusted supplier of genuine JCB spare parts. Quality parts for all JCB machinery with fast delivery and expert support.
          </div>
          <div className={styles.socialRow}>
            <span className={styles.socialDot} />
            <span className={styles.socialDot} />
            <span className={styles.socialDot} />
            <span className={styles.socialDot} />
          </div>
        </div>

        <div>
          <div className={styles.title}>Quick Links</div>
          <div className={styles.links}>
            <Link to="/customer/home">Home</Link>
            <Link to="/customer/catalog">Products</Link>
            <Link to="/customer/home">About Us</Link>
            <Link to="/customer/contact">Contact</Link>
          </div>
        </div>

        <div>
          <div className={styles.title}>Categories</div>
          <div className={styles.links}>
            <Link to={categoryLink("Engine Parts")}>Engine Parts</Link>
            <Link to={categoryLink("Hydraulic Systems")}>Hydraulic Systems</Link>
            <Link to={categoryLink("Electrical Components")}>Electrical Components</Link>
            <Link to={categoryLink("Filters")}>Filters</Link>
            <Link to={categoryLink("Attachments")}>Attachments</Link>
          </div>
        </div>

        <div>
          <div className={styles.title}>Contact Us</div>
          <div className={styles.contact}>
            <div><FiMapPin /> Liyanage Motors, Padalangala Road, Sooriyawewa</div>
            <div><FiPhone /> +94 755678900</div>
            <div><FiMail /> liyanagemotors12@gmail.com</div>
          </div>
        </div>
      </div>

      <div className={styles.bottom}>
        <div>(c) 2025 JCB Parts. All rights reserved.</div>
        <div className={styles.bottomRight}>
          <Link to="/customer/home">Privacy Policy</Link>
          <Link to="/customer/home">Terms of Service</Link>
        </div>
      </div>
    </footer>
  )
}
