import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  FiUser,
  FiMonitor,
  FiBell,
  FiShield,
  FiDatabase,
  FiGrid,
  FiChevronRight,
} from "react-icons/fi";
import styles from "./SettingsLayout.module.css";

export default function SettingsLayout() {
  const location = useLocation();
  const isAdminPortal = location.pathname.startsWith("/admin");
  const base = isAdminPortal ? "/admin" : "/employee";
  const isEmployee = !isAdminPortal;

  return (
    <div className={styles.page}>
      <div className={styles.headerBlock}>
        <div className={styles.h1}>Settings</div>
        <div className={styles.sub}>
          {isEmployee ? "Change your password" : "Manage your account and system settings"}
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.menuCard}>
          <div className={styles.menuTitle}>Settings</div>

          {!isEmployee && (
            <NavLink
              to={`${base}/settings/profile`}
              className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ""}`}
            >
              <span className={styles.left}>
                <FiUser className={styles.ico} />
                <span>Profile</span>
              </span>
              <FiChevronRight className={styles.chev} />
            </NavLink>
          )}

          {!isEmployee && (
            <NavLink
              to={`${base}/settings/system`}
              className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ""}`}
            >
              <span className={styles.left}>
                <FiMonitor className={styles.ico} />
                <span>System Preferences</span>
              </span>
              <FiChevronRight className={styles.chev} />
            </NavLink>
          )}

          {!isEmployee && (
            <NavLink
              to={`${base}/settings/notifications`}
              className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ""}`}
            >
              <span className={styles.left}>
                <FiBell className={styles.ico} />
                <span>Notification Settings</span>
              </span>
              <FiChevronRight className={styles.chev} />
            </NavLink>
          )}

          <NavLink
            to={`${base}/settings/security`}
            className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ""}`}
          >
            <span className={styles.left}>
              <FiShield className={styles.ico} />
              <span>{isEmployee ? "Change Password" : "Security"}</span>
            </span>
            <FiChevronRight className={styles.chev} />
          </NavLink>

          {!isEmployee && (
            <NavLink
              to={`${base}/settings/backup`}
              className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ""}`}
            >
              <span className={styles.left}>
                <FiDatabase className={styles.ico} />
                <span>Backup &amp; Data</span>
              </span>
              <FiChevronRight className={styles.chev} />
            </NavLink>
          )}

          {!isEmployee && (
            <NavLink
              to={`${base}/settings/company`}
              className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ""}`}
            >
              <span className={styles.left}>
                <FiGrid className={styles.ico} />
                <span>Company Information</span>
              </span>
              <FiChevronRight className={styles.chev} />
            </NavLink>
          )}
        </div>

        <div className={styles.contentCard}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
