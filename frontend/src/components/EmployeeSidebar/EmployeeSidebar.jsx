import { NavLink, useNavigate } from 'react-router-dom'
import {
  FiHome,
  FiBox,
  FiShoppingCart,
  FiCalendar,
  FiBarChart2,
  FiUsers,
  FiAlertCircle,
  FiBell,
  FiSettings,
  FiLogOut,
} from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import styles from './EmployeeSidebar.module.css'

const nav = [
  { to: '/employee/dashboard', label: 'Dashboard', icon: <FiHome /> },
  { to: '/employee/inventory', label: 'Manage Inventory', icon: <FiBox /> },
  { to: '/employee/sales', label: 'Sales & Billing', icon: <FiShoppingCart /> },
  { to: '/employee/reservations', label: 'Reservations', icon: <FiCalendar /> },
  { to: '/employee/reports', label: 'Reports', icon: <FiBarChart2 /> },
  { to: '/employee/customers', label: 'Customers', icon: <FiUsers /> },
  { to: '/employee/low-stock', label: 'Low Stock', icon: <FiAlertCircle /> },
  { to: '/employee/alerts', label: 'Alerts', icon: <FiBell /> },
]

export default function EmployeeSidebar() {
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleLogout = () => {
    logout()
    // Employee sidebar logout should ALWAYS go to employee login
    navigate('/employee/signin')
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.profile}>
        <div className={styles.avatar}>U</div>
        <div>
          <div className={styles.name}>Employee</div>
          <div className={styles.role}>Staff</div>
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
          to="/employee/settings"
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
