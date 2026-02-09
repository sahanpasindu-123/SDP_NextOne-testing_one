import { Outlet } from 'react-router-dom'
import EmployeeSidebar from '../../components/EmployeeSidebar/EmployeeSidebar.jsx'
import Topbar from '../../components/Topbar/Topbar.jsx'
import styles from './EmployeeLayout.module.css'

export default function EmployeeLayout() {
  return (
    <div className={styles.shell}>
      <EmployeeSidebar />
      <div className={styles.main}>
        <Topbar />
        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}
