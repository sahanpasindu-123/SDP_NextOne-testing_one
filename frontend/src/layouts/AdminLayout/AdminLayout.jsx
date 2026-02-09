import { Outlet } from 'react-router-dom'
import AdminSidebar from '../../components/AdminSidebar/AdminSidebar.jsx'
import Topbar from '../../components/Topbar/Topbar.jsx'
import styles from './AdminLayout.module.css'

export default function AdminLayout() {
  return (
    <div className={styles.shell}>
      <AdminSidebar />
      <div className={styles.main}>
        <Topbar />
        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
