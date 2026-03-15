import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { FiPhone, FiHome, FiGrid, FiBookmark, FiUser, FiMail, FiLogIn, FiUserPlus, FiLogOut } from 'react-icons/fi'
import { useAuth } from '../../context/AuthContext'
import Modal from '../Modal/Modal.jsx'
import Button from '../Button/Button.jsx'
import styles from './CustomerTopNav.module.css'

export default function CustomerTopNav() {
  const { isLoggedIn, logout } = useAuth()
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)

  const confirmLogout = () => {
    setLogoutConfirmOpen(false)
    logout()
  }
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
                setLogoutConfirmOpen(true)
              }}
            >
              <FiLogOut /> <span>Logout</span>
            </button>
          )}
        </nav>
      </div>

      <Modal
        open={logoutConfirmOpen}
        title="Confirm logout"
        onClose={() => setLogoutConfirmOpen(false)}
        width={460}
      >
        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ color: '#334155', fontWeight: 700 }}>Log out now?</div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button variant="secondary" onClick={() => setLogoutConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmLogout}>Log Out</Button>
          </div>
        </div>
      </Modal>
    </header>
  )
}
