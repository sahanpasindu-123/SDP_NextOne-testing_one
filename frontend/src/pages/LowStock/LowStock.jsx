import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FiDownload } from 'react-icons/fi'
import { inventoryAPI } from '../../api/inventory'
import styles from './LowStock.module.css'

const FALLBACK_LOW_STOCK_THRESHOLD = 5

const toNumber = (val) => {
  const n = Number(val)
  return Number.isFinite(n) ? n : 0
}

const toISODate = (val) => {
  if (!val) return 'N/A'
  const d = new Date(val)
  if (Number.isNaN(d.getTime())) return String(val)
  return d.toISOString().slice(0, 10)
}

export default function LowStock() {
  const isMountedRef = useRef(true)
  const requestIdRef = useRef(0)
  const inFlightRef = useRef(false)

  const [products, setProducts] = useState([])
  const [categoryFilter, setCategoryFilter] = useState('all') // all | CategoryCode
  const [stockFilter, setStockFilter] = useState('all') // all | low | critical
  const [page, setPage] = useState(1)
  const pageSize = 6
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [exportFormat, setExportFormat] = useState('csv') // csv | json | print

  const load = useCallback(async ({ mode } = { mode: 'initial' }) => {
    if (inFlightRef.current) return
    inFlightRef.current = true

    const reqId = ++requestIdRef.current
    const isInitial = mode === 'initial'

    try {
      if (isInitial) setLoading(true)
      else setRefreshing(true)

      const res = await inventoryAPI.list()
      const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
      if (!isMountedRef.current || reqId !== requestIdRef.current) return
      setProducts(list)
      setError(null)
    } catch (e) {
      console.error('[LowStock] Failed to load inventory:', e)
      if (!isMountedRef.current || reqId !== requestIdRef.current) return
      setError(typeof e?.message === 'string' ? e.message : 'Failed to load low stock items')
      if (isInitial) setProducts([])
    } finally {
      if (isMountedRef.current && reqId === requestIdRef.current) {
        setLoading(false)
        setRefreshing(false)
      }
      inFlightRef.current = false
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true

    load({ mode: 'initial' })

    const onFocus = () => {
      if (document.hidden) return
      load({ mode: 'refresh' })
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)

    return () => {
      isMountedRef.current = false
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [load])

  const lowStockRows = useMemo(() => {
    const list = Array.isArray(products) ? products : []
    const mapped = list.map((p) => {
      const src = p || {}
      const rawProductId = src?.productId ?? src?.ProductID ?? src?.id ?? null
      const productId = rawProductId != null ? String(rawProductId) : 'N/A'

      const stockQuantity = toNumber(
        src?.stockQuantity ??
          src?.Stock ??
          src?.stock ??
          src?.quantity ??
          src?.qty ??
          src?.availableStock ??
          0
      )

      const thresholdRaw =
        src?.lowStockThreshold ??
        src?.StockLimit ??
        src?.stockLimit ??
        src?.minStock ??
        src?.minimumStock ??
        null

      const thresholdCandidate =
        thresholdRaw === null || thresholdRaw === undefined ? 0 : toNumber(thresholdRaw)
      const threshold =
        thresholdCandidate > 0 ? thresholdCandidate : FALLBACK_LOW_STOCK_THRESHOLD

      const critical = stockQuantity === 0
      const low = stockQuantity > 0 && stockQuantity <= threshold
      const reorder = Math.max(threshold - stockQuantity, 0)

      const categoryId =
        src?.CategoryID ??
        src?.categoryId ??
        src?.category?.CategoryID ??
        src?.category?.id ??
        null

      const categoryCode =
        src?.CategoryCode ??
        src?.categoryCode ??
        src?.category?.CategoryCode ??
        src?.category?.categoryCode ??
        ''

      const categoryName =
        src?.CategoryName ??
        src?.categoryName ??
        src?.category?.Name ??
        src?.category?.name ??
        ''

      // Prefer a stable numeric ID if available; fall back to code/name so the
      // dropdown value always matches a real data field coming from the API.
      const categoryKey = String(
        categoryId ?? categoryCode ?? categoryName ?? ''
      ).trim()

      return {
        part: src?.Name || src?.name || 'N/A',
        id: productId,
        productId,
        partNo: productId,
        CategoryCode: String(categoryCode || ''),
        categoryCode: String(categoryCode || ''),
        categoryId: categoryId != null ? String(categoryId) : '',
        categoryName: String(categoryName || ''),
        categoryKey,
        units: stockQuantity,
        min: threshold,
        reorder,
        price: `Rs ${toNumber(src?.Price ?? src?.price ?? 0).toLocaleString()}`,
        last: toISODate(src?.UpdatedAt || src?.updatedAt || src?.CreatedAt || src?.createdAt),
        critical,
        low,
        raw: p,
      }
    })

    // Low stock alerts include:
    // - low stock: 0 < stockQuantity <= threshold
    // - out of stock: stockQuantity === 0
    return mapped.filter((r) => r?.low || r?.critical)
  }, [products])

  const categories = useMemo(() => {
    const map = new Map()

    for (const r of lowStockRows) {
      const key = String(
        r?.categoryId ||
          r?.CategoryID ||
          r?.categoryKey ||
          r?.CategoryCode ||
          r?.categoryName ||
          ''
      ).trim()

      if (!key) continue

      const name = String(r?.categoryName || '').trim()
      const code = String(r?.CategoryCode || '').trim()

      if (!map.has(key)) map.set(key, { name, code })
    }

    return Array.from(map.entries())
      .map(([key, meta]) => {
        const baseLabel = meta.name || meta.code || key
        const suffix = meta.name && meta.code ? ` (${meta.code})` : ''
        return {
          value: key,
          label: `${baseLabel}${suffix}`,
        }
      })
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [lowStockRows])

  useEffect(() => {
    if (categoryFilter === 'all') return
    const exists = categories.some((c) => String(c?.value) === String(categoryFilter))
    if (!exists) setCategoryFilter('all')
  }, [categories, categoryFilter])

  const filteredRows = useMemo(() => {
    let list = Array.isArray(lowStockRows) ? lowStockRows : []

    if (categoryFilter !== 'all') {
      list = list.filter((r) => {
        const candidates = [
          r?.categoryId,
          r?.CategoryID,
          r?.categoryKey,
          r?.CategoryCode,
          r?.categoryName,
        ]

        return candidates.some(
          (v) => String(v ?? '').trim() === String(categoryFilter)
        )
      })
    }

    if (stockFilter === 'critical') {
      list = list.filter((r) => !!r?.critical)
    } else if (stockFilter === 'low') {
      list = list.filter((r) => !!r?.low)
    }

    return list
  }, [lowStockRows, categoryFilter, stockFilter])

  useEffect(() => {
    setPage(1)
  }, [categoryFilter, stockFilter])

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

  const lowCount = lowStockRows.filter((r) => r?.low).length
  const criticalCount = lowStockRows.filter((r) => r?.critical).length

  const exportToCSV = () => {
    const rows = Array.isArray(filteredRows) ? filteredRows : []
    if (!rows.length) return

    const header = ['productId', 'name', 'CategoryCode', 'stockQuantity', 'threshold', 'status'].join(',')
    const body = rows
      .map((r) =>
        [
          String(r?.productId ?? ''),
          `"${String(r?.part ?? '').replaceAll('\"', '\"\"')}"`,
          String(r?.CategoryCode ?? ''),
          String(toNumber(r?.units ?? 0)),
          String(toNumber(r?.min ?? 0)),
          r?.critical ? 'OUT_OF_STOCK' : 'LOW_STOCK',
        ].join(',')
      )
      .join('\n')

    const blob = new Blob([`${header}\n${body}`], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'low-stock-export.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportToJSON = () => {
    const rows = Array.isArray(filteredRows) ? filteredRows : []
    if (!rows.length) return

    const payload = rows.map((r) => ({
      productId: r?.productId ?? '',
      name: r?.part ?? '',
      categoryCode: r?.CategoryCode ?? '',
      stockQuantity: toNumber(r?.units ?? 0),
      threshold: toNumber(r?.min ?? 0),
      status: r?.critical ? 'OUT_OF_STOCK' : 'LOW_STOCK',
      lastUpdated: r?.last ?? '',
    }))

    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'low-stock-export.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExport = () => {
    if (loading || refreshing || totalResults === 0) return

    if (exportFormat === 'json') {
      exportToJSON()
      return
    }

    if (exportFormat === 'print') {
      window.print()
      return
    }

    exportToCSV()
  }

  return (
    <div className={styles.page}>
      <div className="pageTitle">Low Stock Alerts</div>

      <div className={styles.hero}>
        <div className={styles.heroTop}>
          <div className={styles.rightFilters} style={{ marginLeft: "auto" }}>
            <select
              className={styles.filterSelect}
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              disabled={loading || refreshing || (!categories.length && categoryFilter === 'all')}
              aria-label="Filter by category"
            >
              <option value="all">Category: All</option>
              {categories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label || c.value}
                </option>
              ))}
            </select>

            <select
              className={styles.filterSelect}
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              disabled={loading || refreshing}
              aria-label="Filter by stock level"
            >
              <option value="all">Stock Level: All</option>
              <option value="low">Stock Level: Low</option>
              <option value="critical">Stock Level: Out of Stock</option>
            </select>

            <select
              className={styles.filterSelect}
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
              disabled={loading || refreshing}
              aria-label="Export format"
            >
              <option value="csv">Format: CSV</option>
              <option value="json">Format: JSON</option>
              <option value="print">Format: Print View</option>
            </select>
            <button
              className={styles.filterButton}
              onClick={() => load({ mode: 'refresh' })}
              disabled={loading || refreshing}
              aria-label="Refresh"
              title="Refresh"
            >
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              className={styles.export}
              onClick={handleExport}
              disabled={loading || refreshing || totalResults === 0}
            >
              <FiDownload /> Export
            </button>
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

          {loading ? (
            <div className={styles.empty}>Loading low stock items...</div>
          ) : error && lowStockRows.length === 0 ? (
            <div className={styles.empty}>{error}</div>
          ) : pagedRows.length ? (
            pagedRows.map((r, idx) => (
              <div key={r?.productId || r?.id || idx} className={styles.tRow}>
                <div className={styles.partCell}>
                  <div className={styles.thumb} />
                  <div>
                    <div className={styles.partName}>{r.part}</div>
                    <div className={styles.partId}>ID: {r.productId}</div>
                  </div>
                </div>

                <div className={styles.mono}>{r.partNo}</div>
                <div>{String(r?.CategoryCode || r?.categoryName || 'N/A')}</div>

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
            ))
          ) : (
            <div className={styles.empty}>
              {lowStockRows.length === 0 ? 'No low stock items' : 'No matching low stock items'}
            </div>
          )}

          <div className={styles.footer}>
            <div className={styles.footLeft}>Showing {showingFrom} to {showingTo} of {totalResults} results</div>
            <div className={styles.footBtns}>
              <button
                className={styles.pager}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={loading || safePage <= 1}
              >
                Previous
              </button>
              <button
                className={styles.pager}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={loading || safePage >= totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
