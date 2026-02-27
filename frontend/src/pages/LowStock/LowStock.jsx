import { useEffect, useMemo, useRef, useState } from 'react'
import { FiSearch, FiDownload } from 'react-icons/fi'
import StatCard from '../../components/StatCard/StatCard.jsx'
import { inventoryAPI } from '../../api/inventory'
import styles from './LowStock.module.css'

const toISODate = (val) => {
  if (!val) return 'N/A'
  const d = new Date(val)
  if (Number.isNaN(d.getTime())) return String(val)
  return d.toISOString().slice(0, 10)
}

export default function LowStock() {
  const isMountedRef = useRef(true)
  const [products, setProducts] = useState([])
  const [categoryFilter, setCategoryFilter] = useState(null) // null = all
  const [stockFilter, setStockFilter] = useState('all') // all | low | critical
  const [page, setPage] = useState(1)
  const pageSize = 6

  const load = async () => {
    try {
      const res = await inventoryAPI.list()
      const list = Array.isArray(res?.data) ? res.data : []
      if (!isMountedRef.current) return
      setProducts(list)
    } catch (e) {
      console.error('[LowStock] Failed to load inventory:', e)
      if (isMountedRef.current) setProducts([])
    }
  }

  useEffect(() => {
    isMountedRef.current = true
    load()
    return () => {
      isMountedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const lowStockRows = useMemo(() => {
    const list = Array.isArray(products) ? products : []
    const mapped = list.map((p) => {
      const units = Number(p?.Stock ?? 0) || 0
      const min = Number(p?.StockLimit ?? 0) || 0
      const critical = units === 0
      const reorder = Math.max(min - units, 0)

      return {
        part: p?.Name || 'N/A',
        id: String(p?.ProductID ?? 'N/A'),
        partNo: String(p?.ProductID ?? 'N/A'),
        cat: p?.CategoryName || 'N/A',
        units,
        min,
        reorder,
        price: `Rs${Number(p?.Price ?? 0).toLocaleString()}`,
        last: toISODate(p?.UpdatedAt || p?.CreatedAt),
        critical,
        raw: p,
      }
    })

    return mapped.filter((r) => Number(r.units) <= Number(r.min))
  }, [products])

  const categories = useMemo(() => {
    const set = new Set()
    for (const r of lowStockRows) {
      if (r?.cat && r.cat !== 'N/A') set.add(r.cat)
    }
    return Array.from(set).sort()
  }, [lowStockRows])

  const filteredRows = useMemo(() => {
    let list = Array.isArray(lowStockRows) ? lowStockRows : []

    if (categoryFilter) {
      list = list.filter((r) => r?.cat === categoryFilter)
    }

    if (stockFilter === 'critical') {
      list = list.filter((r) => Number(r?.units ?? 0) === 0)
    } else if (stockFilter === 'low') {
      list = list.filter((r) => Number(r?.units ?? 0) > 0)
    }

    return list
  }, [lowStockRows, categoryFilter, stockFilter])

  const totalResults = filteredRows.length
  const totalPages = Math.max(1, Math.ceil(totalResults / pageSize))
  const safePage = Math.min(page, totalPages)

  useEffect(() => {
    if (page !== safePage) setPage(safePage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safePage])

  const pagedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize
    return filteredRows.slice(start, start + pageSize)
  }, [filteredRows, safePage])

  const showingFrom = totalResults === 0 ? 0 : (safePage - 1) * pageSize + 1
  const showingTo = totalResults === 0 ? 0 : Math.min(safePage * pageSize, totalResults)

  const lowCount = lowStockRows.length
  const criticalCount = lowStockRows.filter((r) => r?.critical).length

  const cycleCategory = () => {
    setPage(1)
    if (!categories.length) return
    setCategoryFilter((prev) => {
      const opts = [null, ...categories]
      const idx = opts.findIndex((o) => o === prev)
      return opts[(idx + 1) % opts.length]
    })
  }

  const cycleStockLevel = () => {
    setPage(1)
    setStockFilter((prev) => {
      if (prev === 'all') return 'low'
      if (prev === 'low') return 'critical'
      return 'all'
    })
  }

  return (
    <div className={styles.page}>
      <div className="pageTitle">Low Stock Alerts</div>

      <div className={styles.hero}>
        <div className={styles.heroTop}>
          <div className={styles.h1}>Low Stock Alerts</div>

          <div className={styles.rightFilters}>
            <button className={styles.dd} onClick={cycleCategory}>Category ˅</button>
            <button className={styles.dd} onClick={cycleStockLevel}>Stock Level ˅</button>
            <button className={styles.dd}>Format ˅</button>
            <button className={styles.export}><FiDownload /> Export</button>
          </div>
        </div>

        <div className={styles.summary}>
          <div className={styles.sumCardY}>
            <div className={styles.sumTitle}>Total Low Stock Items</div>
            <div className={styles.sumVal}>{lowCount}</div>
            <div className={styles.sumSub}>↗ +2 since yesterday</div>
            <div className={styles.sumIcon}>i</div>
          </div>
          <div className={styles.sumCardR}>
            <div className={styles.sumTitleR}>Critical Stock Items</div>
            <div className={styles.sumVal}>{criticalCount}</div>
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

          {pagedRows.map((r, idx) => (
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
            <div className={styles.footLeft}>Showing {showingFrom} to {showingTo} of {totalResults} results</div>
            <div className={styles.footBtns}>
              <button className={styles.pager} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</button>
              <button className={styles.pager} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
