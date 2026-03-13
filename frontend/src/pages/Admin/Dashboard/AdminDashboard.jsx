import { useEffect, useRef, useState } from 'react'
import { FiUsers, FiBox, FiDollarSign, FiAlertCircle } from 'react-icons/fi'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import StatCard from '../../../components/StatCard/StatCard.jsx'
import Table from '../../../components/Table/Table.jsx'
import Badge from '../../../components/Badge/Badge.jsx'
import { customersAPI } from '../../../api/customers'
import { reportsAPI } from '../../../api/reports'
import styles from './AdminDashboard.module.css'

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const toISODateLocal = (d) => {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const parseMoney = (val) => {
  const raw = String(val ?? '').replace(/,/g, '').replace(/[^\d.-]/g, '')
  const n = Number(raw)
  return Number.isFinite(n) ? n : 0
}

const makeLast7Days = () => {
  const now = new Date()
  const start = new Date(now)
  start.setDate(now.getDate() - 6)
  const days = []
  for (let i = 0; i < 7; i += 1) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    days.push(d)
  }
  return days
}

export default function AdminDashboard() {
  const [customerRows, setCustomerRows] = useState([])
  const [stats, setStats] = useState({
    totalUsers: '0',
    totalProducts: '0',
    revenueThisWeek: 'Rs 0',
    criticalAlerts: '0',
  })
  const [chartData, setChartData] = useState(() =>
    makeLast7Days().map((d) => ({ name: DOW[d.getDay()], sales: 0 }))
  )
  const [orderRows, setOrderRows] = useState([])
  const isMountedRef = useRef(true)
  const intervalRef = useRef(null)
  const inFlightRef = useRef(false)

  const mapCustomers = (response) => {
    const data =
      response?.success && Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response)
            ? response
            : []

    return data.map((customer) => ({
      id: customer.id || customer.CustomerID,
      name: customer.name || customer.Name || customer.firstName || 'Unknown',
      email: customer.email || customer.Email || 'No email',
      status:
        customer.status ||
        (customer.isActive ? 'Active' : 'Inactive'),
      last:
        customer.last ||
        customer.lastLogin ||
        customer.updatedAt ||
        customer.UpdatedAt ||
        'Never',
    }))
  }

  const toOrderStatus = (raw) => {
    const s = String(raw || '').toUpperCase()
    if (s.includes('COMPLETE') || s.includes('PAID')) return 'Completed'
    return 'Pending'
  }

  const loadAll = async () => {
    try {
      if (inFlightRef.current) return
      inFlightRef.current = true

      const days = makeLast7Days()
      const from = toISODateLocal(days[0])
      const to = toISODateLocal(days[days.length - 1])

      const [dashRes, salesRes, customersRes] = await Promise.all([
        reportsAPI.getDashboardStats(),
        reportsAPI.getSalesReport({ from, to }),
        customersAPI.getCustomers(),
      ])

      if (!isMountedRef.current) return

      const dash = dashRes?.data?.data ?? dashRes?.data ?? {}
      const counts = dash?.counts ?? {}
      const lowStock = Array.isArray(dash?.lowStockProducts) ? dash.lowStockProducts : []
      const outOfStockCount = lowStock.filter((p) => Number(p?.stock ?? p?.Stock ?? 0) <= 0).length

      const salesRowsRaw = salesRes?.data?.data ?? salesRes?.data ?? []
      const salesRows = Array.isArray(salesRowsRaw) ? salesRowsRaw : []
      const sumByDate = {}
      for (const r of salesRows) {
        const k = String(r?.date || '').slice(0, 10)
        if (!k) continue
        sumByDate[k] = (sumByDate[k] || 0) + parseMoney(r?.amount)
      }

      const computedChart = days.map((d) => {
        const k = toISODateLocal(d)
        return { name: DOW[d.getDay()], sales: Math.round(sumByDate[k] || 0) }
      })
      const weekRevenue = computedChart.reduce((acc, c) => acc + Number(c.sales || 0), 0)

      const recentSales = Array.isArray(dash?.recentSales) ? dash.recentSales : []
      const mappedOrders = recentSales.map((s) => ({
        id: s?.id ?? 'N/A',
        customer: s?.customer ?? 'N/A',
        items: s?.items ?? '—',
        total:
          typeof s?.total === 'number'
            ? `Rs ${Math.round(s.total).toLocaleString()}`
            : `Rs ${Math.round(parseMoney(s?.total)).toLocaleString()}`,
        status: toOrderStatus(s?.status),
      }))

      setStats({
        totalUsers: String(Number(counts?.customers ?? 0) || 0),
        totalProducts: String(Number(counts?.products ?? 0) || 0),
        revenueThisWeek: `Rs ${Math.round(weekRevenue).toLocaleString()}`,
        criticalAlerts: String(outOfStockCount || 0),
      })
      setChartData(computedChart)
      setOrderRows(mappedOrders)
      setCustomerRows(mapCustomers(customersRes))
    } catch (err) {
      console.error('[AdminDashboard] Failed to load customers:', err)
      if (isMountedRef.current) {
        setStats({
          totalUsers: '0',
          totalProducts: '0',
          revenueThisWeek: 'Rs 0',
          criticalAlerts: '0',
        })
        setChartData(makeLast7Days().map((d) => ({ name: DOW[d.getDay()], sales: 0 })))
        setOrderRows([])
        setCustomerRows([])
      }
    } finally {
      inFlightRef.current = false
    }
  }

  useEffect(() => {
    isMountedRef.current = true

    const stopPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }

    const startPolling = () => {
      if (intervalRef.current) return
      intervalRef.current = setInterval(() => {
        if (document.visibilityState !== 'visible') return
        loadAll()
      }, 10000)
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadAll()
        startPolling()
      } else {
        stopPolling()
      }
    }

    handleVisibility()
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      isMountedRef.current = false
      document.removeEventListener('visibilitychange', handleVisibility)
      stopPolling()
    }
  }, [])

  const cols = [
    { key: 'id', header: 'Order ID', width: 110 },
    { key: 'customer', header: 'Customer' },
    { key: 'items', header: 'Items' },
    { key: 'total', header: 'Total', width: 140 },
    {
      key: 'status',
      header: 'Status',
      width: 130,
      render: (r) =>
        r.status === 'Completed'
          ? <Badge tone="success">Completed</Badge>
          : <Badge tone="warn">Pending</Badge>,
    },
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
          : <Badge tone="danger">Inactive</Badge>,
    },
    { key: 'last', header: 'Last Seen', width: 140 },
  ]

  return (
    <div className={styles.page}>
      <div className="pageTitle">Admin Dashboard</div>
      <div className="pageSub">Overview of system activity and operational metrics.</div>

      <div className={styles.stats}>
        <StatCard label="Total Customers" value={stats.totalUsers} icon={<FiUsers />} iconTone="blue" />
        <StatCard label="Total Products" value={stats.totalProducts} icon={<FiBox />} iconTone="purple" />
        <StatCard label="Revenue (This Week)" value={stats.revenueThisWeek} icon={<FiDollarSign />} iconTone="accent" />
        <StatCard label="Out of Stock Items" value={stats.criticalAlerts} icon={<FiAlertCircle />} iconTone="red" />
      </div>

      <div className={styles.grid}>
        <div className={`card ${styles.panel}`}>
          <div className={styles.panelHead}>Sales (Last 7 Days)</div>
          <div className={styles.chartBox}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="sales" fill="var(--accent)" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`card ${styles.panel}`}>
          <div className={styles.panelHead}>Recent Orders</div>
          <Table columns={cols} rows={orderRows} />
        </div>
      </div>

      <div className={styles.grid}>
        <div className={`card ${styles.panel}`}>
          <div className={styles.panelHead}>Recent Customers</div>
          <Table columns={customerCols} rows={customerRows} />
        </div>
      </div>
    </div>
  )
}
