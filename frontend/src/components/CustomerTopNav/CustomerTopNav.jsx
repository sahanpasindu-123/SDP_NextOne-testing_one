import { Link, NavLink } from 'react-router-dom'
import { FiPhone, FiHome, FiGrid, FiBookmark, FiUser, FiMail, FiLogIn, FiUserPlus, FiLogOut } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import styles from './CustomerTopNav.module.css'

export default function CustomerTopNav() {
  const { isLoggedIn, logout } = useAuth()
  return (
    <header className={styles.header}>
      <div className={styles.topStrip}>
        <div className={styles.topLeft}>Get JCB spare parts</div>
        <div className={styles.topRight}>
          <Link to="/about">About Us</Link>
          <Link to="/customer/contact">Contact</Link>
          <span className={styles.phone}><FiPhone /> +94 755678900</span>
        </div>
      </div>

      <div className={styles.navBar}>
        <div className={styles.brand}>Liyanage Motors</div>

        <nav className={styles.nav}>
          <NavLink to="/customer/home" className={({isActive})=>`${styles.link} ${isActive?styles.active:''}`}>
            <FiHome /> <span>Home</span>
          </NavLink>
          <NavLink to="/customer/catalog" className={({isActive})=>`${styles.link} ${isActive?styles.active:''}`}>
            <FiGrid /> <span>Parts Catalog</span>
          </NavLink>
          <NavLink to="/customer/reservations" className={({isActive})=>`${styles.link} ${isActive?styles.active:''}`}>
            <FiBookmark /> <span>My Reservations</span>
          </NavLink>
          <NavLink to="/customer/profile" className={({isActive})=>`${styles.link} ${isActive?styles.active:''}`}>
            <FiUser /> <span>Profile</span>
          </NavLink>
          <NavLink to="/customer/contact" className={({isActive})=>`${styles.link} ${isActive?styles.active:''}`}>
            <FiMail /> <span>Contact</span>
          </NavLink>
          
          {!isLoggedIn ? (
            <>
              <NavLink to="/customer/signin" className={styles.link}>
                <FiLogIn /> <span>Sign In</span>
              </NavLink>
              <NavLink to="/auth/signup" className={styles.link}>
                <FiUserPlus /> <span>Sign Up</span>
              </NavLink>
            </>
          ) : (
            <button 
              className={styles.link} 
              onClick={() => {
                const ok = window.confirm("Log out now?");
                if (!ok) return;
                logout()
              }}
            >
              <FiLogOut /> <span>Logout</span>
            </button>
          )}
        </nav>
      </div>
    </header>
  )
}
