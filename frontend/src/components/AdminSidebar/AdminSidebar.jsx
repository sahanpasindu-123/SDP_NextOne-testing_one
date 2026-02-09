import { NavLink, useNavigate } from 'react-router-dom'
import {
  FiHome,
  FiBox,
  FiTag,
  FiClock,
  FiBarChart2,
  FiCalendar,
  FiUsers,
  FiAlertCircle,
  FiSettings,
  FiLogOut,
  FiMail,
} from 'react-icons/fi'
import styles from './AdminSidebar.module.css'

const nav = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: <FiHome /> },
  { to: '/admin/inventory', label: 'Inventory', icon: <FiBox /> },
  { to: '/admin/pending', label: 'Product Requests', icon: <FiClock /> },
  { to: '/admin/sales-history', label: 'Sales History', icon: <FiBarChart2 /> },
  { to: '/admin/reservations', label: 'Reservations', icon: <FiCalendar /> },
  { to: '/admin/reports/sales', label: 'Reports', icon: <FiBarChart2 /> },
  { to: '/admin/low-stock', label: 'Low Stock', icon: <FiAlertCircle />, badge: '5' },
  { to: '/admin/user-management', label: 'User Management', icon: <FiUsers /> },
  { to: "/admin/categories", label: "Categories", icon: <FiTag /> },
  { to: "/admin/contacts", label: "Contacts", icon: <FiMail /> },

]

export default function AdminSidebar() {
  const navigate = useNavigate()

  const handleLogout = () => {
    // Clear auth (clear everything used by route guards + axios client)
    localStorage.removeItem('token')
    localStorage.removeItem('role')
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    localStorage.removeItem('userId')

    // Admin sidebar logout should ALWAYS go to admin login
    navigate('/admin/signin')
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.profile}>
        <div className={styles.avatar}>AD</div>
        <div>
          <div className={styles.name}>Admin</div>
          <div className={styles.role}>System Administrator</div>
        </div>
      </div>

      <nav className={styles.nav}>
        {nav.map((i) => (
          <NavLink
            key={i.to}
            to={i.to}
            className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}
          >
            <span className={styles.icon}>{i.icon}</span>
            <span className={styles.label}>{i.label}</span>
            {i.badge ? <span className={styles.badge}>{i.badge}</span> : null}
          </NavLink>
        ))}
      </nav>

      <div className={styles.bottom}>
        <NavLink
          to="/admin/settings/profile"
          className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}
        >
          <span className={styles.icon}>
            <FiSettings />
          </span>
          <span className={styles.label}>Settings</span>
        </NavLink>

        <button className={styles.item} onClick={handleLogout} type="button">
          <span className={styles.icon}>
            <FiLogOut />
          </span>
          <span className={styles.label}>Log out</span>
        </button>
      </div>
    </aside>
  )
}
