import { FiSearch, FiDownload } from 'react-icons/fi'
import StatCard from '../../components/StatCard/StatCard.jsx'
import styles from './LowStock.module.css'

const rows = [
  { part: 'Hydraulic Pump Assembly', id: 'P001', partNo: 'JCB-332/F2302', cat: 'Hydraulic System', units: 3, min: 10, reorder: 5, price: 'Rs1250.00', last: '2023-10-15', critical: false },
  { part: 'Engine Oil Filter', id: 'P002', partNo: 'JCB-02/800150', cat: 'Engine Parts', units: 7, min: 20, reorder: 15, price: 'Rs45.50', last: '2023-11-02', critical: false },
  { part: 'Fuel Injector', id: 'P003', partNo: 'JCB-320/06737', cat: 'Engine Parts', units: 2, min: 8, reorder: 5, price: 'Rs320.75', last: '2023-09-20', critical: true },
  { part: 'Alternator Assembly', id: 'P004', partNo: 'JCB-714/40154', cat: 'Electrical Components', units: 1, min: 5, reorder: 3, price: 'Rs580.25', last: '2023-10-05', critical: true },
  { part: 'Bucket Tooth', id: 'P005', partNo: 'JCB-531/03205', cat: 'Attachments', units: 15, min: 30, reorder: 20, price: 'Rs85.00', last: '2023-11-10', critical: false },
  { part: 'Brake Pad Set', id: 'P006', partNo: 'JCB-15/920160', cat: 'Brake System', units: 4, min: 12, reorder: 8, price: 'Rs125.50', last: '2023-09-15', critical: false },
]

export default function LowStock() {
  return (
    <div className={styles.page}>
      <div className="pageTitle">Low Stock Alerts</div>

      <div className={styles.hero}>
        <div className={styles.heroTop}>
          <div className={styles.h1}>Low Stock Alerts</div>

          <div className={styles.rightFilters}>
            <button className={styles.dd}>Category ˅</button>
            <button className={styles.dd}>Stock Level ˅</button>
            <button className={styles.dd}>Format ˅</button>
            <button className={styles.export}><FiDownload /> Export</button>
          </div>
        </div>

        <div className={styles.summary}>
          <div className={styles.sumCardY}>
            <div className={styles.sumTitle}>Total Low Stock Items</div>
            <div className={styles.sumVal}>12</div>
            <div className={styles.sumSub}>↗ +2 since yesterday</div>
            <div className={styles.sumIcon}>i</div>
          </div>
          <div className={styles.sumCardR}>
            <div className={styles.sumTitleR}>Critical Stock Items</div>
            <div className={styles.sumVal}>5</div>
            <div className={styles.sumSubR}>↗ +1 since yesterday</div>
            <div className={styles.sumIconR}>!</div>
          </div>
        </div>

        <div className={`card ${styles.tableCard}`}>
          <div className={styles.tHead}>
            <div>Part Details</div>
            <div>Part Number</div>
            <div>Category</div>
            <div>Stock Level</div>
            <div>Price</div>
            <div>Last Ordered</div>
          </div>

          {rows.map((r, idx) => (
            <div key={idx} className={styles.tRow}>
              <div className={styles.partCell}>
                <div className={styles.thumb} />
                <div>
                  <div className={styles.partName}>{r.part}</div>
                  <div className={styles.partId}>ID: {r.id}</div>
                </div>
              </div>

              <div className={styles.mono}>{r.partNo}</div>
              <div>{r.cat}</div>

              <div className={styles.stockCell}>
                <div className={styles.stockTop}>
                  <span className={`${styles.warnDot} ${r.critical ? styles.red : styles.orange}`}>!</span>
                  <strong>{r.units} units</strong>
                </div>
                <div className={styles.stockSub}>Min: {r.min} | Reorder: {r.reorder}</div>
              </div>

              <div>{r.price}</div>
              <div>{r.last}</div>
            </div>
          ))}

          <div className={styles.footer}>
            <div className={styles.footLeft}>Showing 1 to 6 of 12 results</div>
            <div className={styles.footBtns}>
              <button className={styles.pager}>Previous</button>
              <button className={styles.pager}>Next</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
