import { FiSearch, FiBell, FiUser } from 'react-icons/fi'
import { useLocation, useNavigate } from 'react-router-dom'
import styles from './Topbar.module.css'

export default function Topbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const path = location?.pathname || ''
  const notificationsPath = path.startsWith('/admin')
    ? '/admin/low-stock'
    : '/employee/alerts'

  return (
    <header className={styles.topbar}>
      <div className={styles.right}>
        <div className={styles.search}>
          <FiSearch className={styles.searchIcon} />
          <input placeholder="Search..." />
        </div>

        <button
          className={styles.iconBtn}
          aria-label="Notifications"
          type="button"
          onClick={() => navigate(notificationsPath)}
        >
          <FiBell />
          <span className={styles.dot}>3</span>
        </button>

        <div className={styles.user}>
          <div className={styles.userBadge}><FiUser /></div>
          <div className={styles.userName}>John Smith</div>
        </div>
      </div>
    </header>
  )
}
