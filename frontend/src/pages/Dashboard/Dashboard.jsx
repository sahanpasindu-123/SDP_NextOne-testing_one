import { useEffect, useRef, useState } from 'react'
import { FiDollarSign, FiClock, FiAlertCircle, FiMessageSquare } from 'react-icons/fi'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import StatCard from '../../components/StatCard/StatCard.jsx'
import Table from '../../components/Table/Table.jsx'
import Button from '../../components/Button/Button.jsx'
import Badge from '../../components/Badge/Badge.jsx'
import { customersAPI } from '../../api/customers'
import { reportsAPI } from "../../api/reports";
import { inventoryAPI } from '../../api/inventory'
import styles from './Dashboard.module.css'

const FALLBACK_LOW_STOCK_THRESHOLD = 5

const toNumber = (val) => {
  const n = Number(val)
  return Number.isFinite(n) ? n : 0
}

const normalizeLowStockProducts = (products) => {
  const list = Array.isArray(products) ? products : []

  const mapped = list
    .map((p) => {
      const src = p || {}
      const rawProductId = src?.productId ?? src?.ProductID ?? src?.id ?? null
      const productId = rawProductId != null ? String(rawProductId) : 'N/A'

      const name = src?.Name ?? src?.name ?? 'N/A'

      const stockQuantity = toNumber(
        src?.stockQuantity ??
          src?.Stock ??
          src?.stock ??
          src?.quantity ??
          src?.qty ??
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

      // Low stock alerts include: 0 < stockQuantity <= threshold
      const low = stockQuantity > 0 && stockQuantity <= threshold
      if (!low) return null

      const categoryCode =
        src?.CategoryCode ??
        src?.categoryCode ??
        src?.category?.CategoryCode ??
        src?.category?.categoryCode ??
        ''

      return {
        id: productId,
        productId,
        name: String(name || 'N/A'),
        stock: stockQuantity,
        stockQuantity,
        lowStockThreshold: threshold,
        CategoryCode: String(categoryCode || ''),
        categoryCode: String(categoryCode || ''),
        raw: p,
      }
    })
    .filter(Boolean)

  mapped.sort((a, b) => {
    const stockDiff = toNumber(a?.stock) - toNumber(b?.stock)
    if (stockDiff !== 0) return stockDiff
    return String(a?.productId || '').localeCompare(String(b?.productId || ''))
  })

  return mapped
}

export default function Dashboard() {
  const [customerRows, setCustomerRows] = useState([])
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)

  const [lowStockRows, setLowStockRows] = useState([])
  const [lowStockLoading, setLowStockLoading] = useState(true)
  const [lowStockRefreshing, setLowStockRefreshing] = useState(false)
  const [lowStockError, setLowStockError] = useState(null)

  const isMountedRef = useRef(true)
  const lowStockRequestIdRef = useRef(0)
  const lowStockInFlightRef = useRef(false)

  // ---------------- Load customers ----------------
  const loadCustomers = async () => {
    try {
      const response = await customersAPI.getCustomers()

      const data =
        response?.success && Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.data)
            ? response.data
            : Array.isArray(response)
              ? response
              : []

      const mapped = data.map((customer) => ({
        id: customer.id || customer.CustomerID,
        name: customer.name || customer.Name || customer.firstName || 'Unknown',
        email: customer.email || customer.Email || 'No email',
        status: customer.status || (customer.isActive ? 'Active' : 'Inactive'),
        last:
          customer.last ||
          customer.lastLogin ||
          customer.updatedAt ||
          customer.UpdatedAt ||
          'Never'
      }))

      if (!isMountedRef.current) return
      setCustomerRows(mapped)
    } catch (err) {
      console.error('[Dashboard] Failed to load customers:', err)
      if (isMountedRef.current) {
        setCustomerRows([])
      }
    }
  }

  // ---------------- Load dashboard stats ----------------
  const loadDashboard = async () => {
    try {
      const res = await reportsAPI.getDashboardStats()
      const payload = res?.data || {}

      if (!isMountedRef.current) return
      setDashboard(payload)
    } catch (err) {
      console.error('[Dashboard] Failed to load dashboard:', err)
      if (isMountedRef.current) {
        setDashboard(null)
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }

  // ---------------- Load low stock (fresh inventory) ----------------
  const loadLowStock = async ({ mode } = { mode: 'initial' }) => {
    if (lowStockInFlightRef.current) return
    lowStockInFlightRef.current = true

    const reqId = ++lowStockRequestIdRef.current
    const isInitial = mode === 'initial'

    try {
      if (isInitial) setLowStockLoading(true)
      else setLowStockRefreshing(true)

      const res = await inventoryAPI.list()
      const list =
        res?.success && Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res?.data)
            ? res.data
            : Array.isArray(res)
              ? res
              : []

      const next = normalizeLowStockProducts(list)

      if (!isMountedRef.current || reqId !== lowStockRequestIdRef.current) return
      setLowStockRows(next)
      setLowStockError(null)
    } catch (err) {
      console.error('[Dashboard] Failed to refresh low stock alerts:', err)
      if (!isMountedRef.current || reqId !== lowStockRequestIdRef.current) return
      setLowStockError(
        typeof err?.message === 'string' && err.message.trim()
          ? err.message
          : 'Failed to refresh low stock alerts'
      )
    } finally {
      if (isMountedRef.current && reqId === lowStockRequestIdRef.current) {
        setLowStockLoading(false)
        setLowStockRefreshing(false)
      }
      lowStockInFlightRef.current = false
    }
  }

  useEffect(() => {
    isMountedRef.current = true

    loadCustomers()
    loadDashboard()
    loadLowStock({ mode: 'initial' })

    const interval = setInterval(() => {
      loadCustomers()
      loadDashboard()
    }, 10000)

    const onFocus = () => {
      if (document.hidden) return
      loadLowStock({ mode: 'refresh' })
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onFocus)

    return () => {
      isMountedRef.current = false
      clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onFocus)
    }
  }, [])

  if (loading) {
    return <p>Loading dashboard...</p>
  }

  const safeDashboard = dashboard || { recentSales: [], lowStockProducts: [], counts: {} }

  const recentSales = Array.isArray(safeDashboard?.recentSales)
    ? safeDashboard.recentSales
    : []

  const lowStockProducts = Array.isArray(lowStockRows) ? lowStockRows : []

  const counts = safeDashboard?.counts || {}

  // ---------------- Table configs ----------------
  const recentSalesCols = [
    { key: 'customer', header: 'Customer' },
    { key: 'total', header: 'Total', width: 140 },
    { key: 'status', header: 'Status', width: 120 },
    { key: 'date', header: 'Date', width: 140 },
  ]

  const recentSalesRows = recentSales.map(s => ({
    ...s,
    total: `Rs ${s.total}`,
    date: s.date ? new Date(s.date).toLocaleDateString() : '-'
  }))

  const lowCols = [
    {
      key: 'product',
      header: 'Product',
      render: (r) => {
        const productId = r?.productId ?? r?.ProductID ?? r?.id ?? 'N/A'
        const name = String(r?.name ?? r?.Name ?? '').trim()
        if (!name) return String(productId)
        return `${productId} — ${name}`
      },
    },
    { key: 'stock', header: 'Current Stock', width: 140 },
  ]

  const customerCols = [
    { key: 'name', header: 'Customer' },
    { key: 'email', header: 'Email' },
    {
      key: 'status',
      header: 'Status',
      width: 120,
      render: (r) =>
        r.status === 'Active'
          ? <Badge tone="success">Active</Badge>
          : <Badge tone="danger">Inactive</Badge>
    },
    { key: 'last', header: 'Last Seen', width: 140 },
  ]

  // ---------------- Chart data ----------------
  const barData = recentSales.map((s, i) => ({
    name: `#${i + 1}`,
    sales: Number(s.total) || 0,
    target: (Number(s.total) || 0) + 1000,
  }))

  const pie = lowStockProducts.map((p) => ({
    name: p.productId ?? p.name,
    value: toNumber(p.stock),
    color: '#ef4444',
  }))

  return (
    <div className={styles.page}>
      <div className="pageTitle">Dashboard</div>

      <div className={styles.stats}>
        <StatCard label="Customers" value={counts.customers || 0} icon={<FiMessageSquare />} />
        <StatCard label="Products" value={counts.products || 0} icon={<FiDollarSign />} />
        <StatCard label="Sales" value={counts.sales || 0} icon={<FiDollarSign />} />
        <StatCard label="Reservations" value={counts.reservations || 0} icon={<FiClock />} />
      </div>

      <div className={styles.grid2}>
        <div className={`card ${styles.panel}`}>
          <div className={styles.panelHead}>Sales Performance</div>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="sales" fill="var(--accent)" />
              <Bar dataKey="target" fill="#3dd9ff" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={`card ${styles.panel}`}>
          <div className={styles.panelHead}>Low Stock Distribution</div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pie} dataKey="value" outerRadius={90}>
                {pie.map((p) => (
                  <Cell key={p.name} fill={p.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={styles.grid2}>
        <div className={`card ${styles.tableCard}`}>
          <div className={styles.tableHead}>Recent Sales</div>
          <Table columns={recentSalesCols} rows={recentSalesRows} />
        </div>

        <div className={`card ${styles.tableCard}`}>
          <div className={styles.tableHead}>Recent Customers</div>
          <Table columns={customerCols} rows={customerRows} />
        </div>
      </div>

      <div className={`card ${styles.tableCard}`}>
        <div className={styles.tableHead}>
          <FiAlertCircle style={{ color: '#ef4444' }} /> Low Stock Alert
          <div className={styles.headRight}>
            {lowStockRefreshing ? (
              <span className={styles.refreshText}>Updating...</span>
            ) : null}
            <Button
              style={{ height: 30, padding: '0 12px', borderRadius: 999 }}
              variant="primary"
              type="button"
              onClick={() => loadLowStock({ mode: 'refresh' })}
              disabled={lowStockLoading || lowStockRefreshing}
            >
              {lowStockRefreshing ? 'Updating...' : 'Update'}
            </Button>
            <span className={styles.countPill}>{lowStockProducts.length} items</span>
          </div>
        </div>

        {lowStockLoading ? (
          <div className={styles.lowStockMsg}>Loading low stock alerts...</div>
        ) : lowStockError && lowStockProducts.length === 0 ? (
          <div className={styles.lowStockError}>{lowStockError}</div>
        ) : lowStockProducts.length === 0 ? (
          <div className={styles.lowStockMsg}>No low stock alerts</div>
        ) : (
          <Table columns={lowCols} rows={lowStockProducts} />
        )}

        {lowStockError && lowStockProducts.length > 0 ? (
          <div className={styles.lowStockError}>{lowStockError}</div>
        ) : null}
      </div>
    </div>
  )
}
