import { FiSearch, FiBell, FiUser } from 'react-icons/fi'
import styles from './Topbar.module.css'

export default function Topbar() {
  return (
    <header className={styles.topbar}>
      <div className={styles.right}>
        <div className={styles.search}>
          <FiSearch className={styles.searchIcon} />
          <input placeholder="Search..." />
        </div>

        <button className={styles.iconBtn} aria-label="Notifications">
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
