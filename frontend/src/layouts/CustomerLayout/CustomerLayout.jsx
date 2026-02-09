import { Outlet } from 'react-router-dom'
import CustomerTopNav from '../../components/CustomerTopNav/CustomerTopNav.jsx'
import CustomerFooter from '../../components/CustomerFooter/CustomerFooter.jsx'
import styles from './CustomerLayout.module.css'

export default function CustomerLayout() {
  return (
    <div className={styles.shell}>
      <CustomerTopNav />
      <main className={styles.main}>
        <Outlet />
      </main>
      <CustomerFooter />
    </div>
  )
}
