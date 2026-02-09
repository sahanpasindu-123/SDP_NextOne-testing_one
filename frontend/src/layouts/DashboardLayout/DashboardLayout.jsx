import { Outlet } from 'react-router-dom'
import Sidebar from '../../components/Sidebar/Sidebar.jsx'
import Topbar from '../../components/Topbar/Topbar.jsx'
import styles from './DashboardLayout.module.css'

export default function DashboardLayout() {
  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.main}>
        <Topbar />
        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
