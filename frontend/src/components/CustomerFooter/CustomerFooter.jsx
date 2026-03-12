import { useMemo } from "react";
import { Link } from "react-router-dom";
import { FiMapPin, FiPhone, FiMail } from 'react-icons/fi'
import styles from './CustomerFooter.module.css'
import { useCategories } from "../../context/CategoriesContext.jsx";

export default function CustomerFooter() {
  const { categories } = useCategories();

  const featuredCategories = useMemo(() => {
    const safeCategories = Array.isArray(categories) ? categories : [];

    const preferredNames = [
      "Engine Parts",
      "Hydraulic Systems",
      "Electrical Components",
      "Filters",
      "Attachments",
    ];

    const byNameLower = new Map(
      safeCategories.map((c) => [String(c?.Name || "").trim().toLowerCase(), c])
    );

    const picked = [];
    const pickedCodes = new Set();

    preferredNames.forEach((name) => {
      const match = byNameLower.get(String(name).trim().toLowerCase());
      const code = String(match?.CategoryCode || "").trim();
      if (match && code && !pickedCodes.has(code)) {
        picked.push(match);
        pickedCodes.add(code);
      }
    });

    const rest = safeCategories
      .filter((c) => {
        const code = String(c?.CategoryCode || "").trim();
        return code && !pickedCodes.has(code);
      })
      .sort((a, b) =>
        String(a?.Name || "").localeCompare(String(b?.Name || ""), undefined, {
          sensitivity: "base",
        })
      );

    return [...picked, ...rest].slice(0, 5);
  }, [categories]);

  const categoryLink = (category) => {
    const code = String(category?.CategoryCode || "").trim();
    if (!code) return "/customer/catalog";
    return `/customer/catalog?categoryCode=${encodeURIComponent(code)}`;
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
            <Link to="/about">About Us</Link>
            <Link to="/customer/contact">Contact</Link>
          </div>
        </div>

        <div>
          <div className={styles.title}>Categories</div>
          <div className={styles.links}>
            {featuredCategories.length ? (
              featuredCategories.map((c) => (
                <Link key={String(c?.CategoryCode)} to={categoryLink(c)}>
                  {c?.Name || String(c?.CategoryCode)}
                </Link>
              ))
            ) : (
              <Link to="/customer/catalog">Browse Catalog</Link>
            )}
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
          <Link to="/privacy">Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
        </div>
      </div>
    </footer>
  )
}
