import { NavLink } from 'react-router-dom'
import { FiHome, FiBox, FiShoppingCart, FiCalendar, FiBarChart2, FiUsers, FiAlertCircle, FiBell, FiSettings, FiLogOut } from 'react-icons/fi'
import styles from './Sidebar.module.css'

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: <FiHome /> },
  { to: '/inventory', label: 'Manage Inventory', icon: <FiBox /> },
  { to: '/sales', label: 'Sales & Billing', icon: <FiShoppingCart /> },
  { to: '/reservations', label: 'Reservations', icon: <FiCalendar /> },
  { to: '/reports/sales', label: 'Reports', icon: <FiBarChart2 /> },
  { to: '/customers', label: 'Customers', icon: <FiUsers /> },
  { to: '/low-stock', label: 'Low Stock', icon: <FiAlertCircle />, badge: '5' },
  { to: '/alerts', label: 'Alerts', icon: <FiBell />, badge: '7' },
]

export default function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.profile}>
        <div className={styles.avatar}>JS</div>
        <div>
          <div className={styles.name}>John Smith</div>
          <div className={styles.role}>Parts Manager</div>
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
        <NavLink to="/settings/system" className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}>
          <span className={styles.icon}><FiSettings /></span>
          <span className={styles.label}>Settings</span>
        </NavLink>
        <a className={styles.item} href="#" onClick={(e)=>e.preventDefault()}>
          <span className={styles.icon}><FiLogOut /></span>
          <span className={styles.label}>Log out</span>
        </a>
      </div>
    </aside>
  )
}
