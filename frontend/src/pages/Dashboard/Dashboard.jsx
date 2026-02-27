import { useEffect, useRef, useState } from 'react'
import { FiDollarSign, FiClock, FiAlertCircle, FiMessageSquare } from 'react-icons/fi'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import StatCard from '../../components/StatCard/StatCard.jsx'
import Table from '../../components/Table/Table.jsx'
import Button from '../../components/Button/Button.jsx'
import Badge from '../../components/Badge/Badge.jsx'
import { customersAPI } from '../../api/customers'
import { reportsAPI } from "../../api/reports";
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const [customerRows, setCustomerRows] = useState([])
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)

  const isMountedRef = useRef(true)

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

  useEffect(() => {
    isMountedRef.current = true

    loadCustomers()
    loadDashboard()

    const interval = setInterval(() => {
      loadCustomers()
      loadDashboard()
    }, 10000)

    return () => {
      isMountedRef.current = false
      clearInterval(interval)
    }
  }, [])

  if (loading) {
    return <p>Loading dashboard...</p>
  }

  const safeDashboard = dashboard || { recentSales: [], lowStockProducts: [], counts: {} }

  const recentSales = Array.isArray(safeDashboard?.recentSales)
    ? safeDashboard.recentSales
    : []

  const lowStockProducts = Array.isArray(safeDashboard?.lowStockProducts)
    ? safeDashboard.lowStockProducts
    : []

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
    { key: 'name', header: 'Product' },
    { key: 'stock', header: 'Current Stock', width: 140 },
    {
      key: 'act',
      header: 'Action',
      width: 120,
      render: () => (
        <Button
          style={{ height: 30, padding: '0 12px', borderRadius: 999 }}
          variant="primary"
          type="button"
        >
          Update
        </Button>
      )
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
    name: p.name,
    value: p.stock,
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
              <Bar dataKey="sales" fill="#e2ad00" />
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
          <span className={styles.countPill}>{lowStockProducts.length} items</span>
        </div>
        <Table columns={lowCols} rows={lowStockProducts} />
      </div>
    </div>
  )
}