import { FiMapPin, FiPhone, FiMail } from 'react-icons/fi'
import styles from './CustomerFooter.module.css'

export default function CustomerFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.grid}>
        <div>
          <div className={styles.title}>JCB Parts</div>
          <div className={styles.p}>
            Your trusted supplier of genuine JCB spare parts. Quality parts for all JCB machinery with fast delivery and expert support.
          </div>
          <div className={styles.socialRow}>
            <span className={styles.socialDot} />
            <span className={styles.socialDot} />
            <span className={styles.socialDot} />
            <span className={styles.socialDot} />
          </div>
        </div>

        <div>
          <div className={styles.title}>Quick Links</div>
          <div className={styles.links}>
            <a href="/customer/home">Home</a>
            <a href="/customer/catalog">Products</a>
            <a href="#" onClick={(e)=>e.preventDefault()}>About Us</a>
            <a href="/customer/contact">Contact</a>
          </div>
        </div>

        <div>
          <div className={styles.title}>Categories</div>
          <div className={styles.links}>
            <a href="#" onClick={(e)=>e.preventDefault()}>Engine Parts</a>
            <a href="#" onClick={(e)=>e.preventDefault()}>Hydraulic Systems</a>
            <a href="#" onClick={(e)=>e.preventDefault()}>Electrical Components</a>
            <a href="#" onClick={(e)=>e.preventDefault()}>Filters</a>
            <a href="#" onClick={(e)=>e.preventDefault()}>Attachments</a>
          </div>
        </div>

        <div>
          <div className={styles.title}>Contact Us</div>
          <div className={styles.contact}>
            <div><FiMapPin /> Liyanage Motors, Padalangala Road, Sooriyawewa</div>
            <div><FiPhone /> +94 755678900</div>
            <div><FiMail /> liyanagemotors12@gmail.com</div>
          </div>
        </div>
      </div>

      <div className={styles.bottom}>
        <div>© 2025 JCB Parts. All rights reserved.</div>
        <div className={styles.bottomRight}>
          <a href="#" onClick={(e)=>e.preventDefault()}>Privacy Policy</a>
          <a href="#" onClick={(e)=>e.preventDefault()}>Terms of Service</a>
        </div>
      </div>
    </footer>
  )
}
