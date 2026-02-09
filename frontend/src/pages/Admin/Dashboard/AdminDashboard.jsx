import { useEffect, useRef, useState } from 'react'
import { FiUsers, FiBox, FiDollarSign, FiAlertCircle } from 'react-icons/fi'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import StatCard from '../../../components/StatCard/StatCard.jsx'
import Table from '../../../components/Table/Table.jsx'
import Badge from '../../../components/Badge/Badge.jsx'
import { customersAPI } from '../../../api/customers'
import styles from './AdminDashboard.module.css'

const chart = [
  { name: 'Mon', sales: 18000 },
  { name: 'Tue', sales: 12500 },
  { name: 'Wed', sales: 21400 },
  { name: 'Thu', sales: 9800 },
  { name: 'Fri', sales: 23600 },
  { name: 'Sat', sales: 14200 },
  { name: 'Sun', sales: 7600 },
]

export default function AdminDashboard() {
  const [customerRows, setCustomerRows] = useState([])

  // ✅ React 18 StrictMode mounts effects twice in DEV.
  // Guard to avoid duplicate polling intervals.
  const didStartPollingRef = useRef(false)

  const loadCustomers = async () => {
    try {
      const response = await customersAPI.getCustomers()
      const data = response?.success ? response.data : response?.data || response || []
      const mapped = (data || []).map((customer) => ({
        id: customer.id ?? customer.CustomerID,
        name: customer.name || customer.Name || customer.firstName || 'Unknown',
        email: customer.email || customer.Email || 'No email',
        status: customer.status || (customer.isActive ? 'Active' : 'Inactive'),
        last: customer.last || customer.lastLogin || customer.updatedAt || customer.UpdatedAt || 'Never'
      }))
      setCustomerRows(mapped)
    } catch (err) {
      console.error('❌ [AdminDashboard] Failed to load customers:', err)
      setCustomerRows([])
    }
  }

  useEffect(() => {
    if (didStartPollingRef.current) return
    didStartPollingRef.current = true

    loadCustomers()
    const interval = setInterval(loadCustomers, 10000)
    return () => clearInterval(interval)
  }, [])

  const cols = [
    { key: 'id', header: 'Order ID', width: 110 },
    { key: 'customer', header: 'Customer' },
    { key: 'items', header: 'Items' },
    { key: 'total', header: 'Total', width: 140 },
    { key: 'status', header: 'Status', width: 130, render:(r)=> (
      r.status === 'Completed' ? <Badge tone="success">Completed</Badge> : <Badge tone="warn">Pending</Badge>
    )},
  ]
  const rows = [
    { id: 'ORD-7845', customer: 'ABC Construction', items: 'Hydraulic Cylinder (x3)', total: 'Rs 40,500', status: 'Pending' },
    { id: 'ORD-7844', customer: 'XYZ Contractors', items: 'Engine Filter Kit (x10)', total: 'Rs 9,500', status: 'Completed' },
    { id: 'ORD-7843', customer: 'Metro Builders', items: 'Transmission Parts (x1)', total: 'Rs 24,500', status: 'Pending' },
  ]

  const customerCols = [
    { key: 'name', header: 'Customer' },
    { key: 'email', header: 'Email' },
    { key: 'status', header: 'Status', width: 120, render: (r) => (
      r.status === 'Active' ? <Badge tone="success">Active</Badge> : <Badge tone="danger">Inactive</Badge>
    )},
    { key: 'last', header: 'Last Seen', width: 140 },
  ]

  return (
    <div className={styles.page}>
      <div className="pageTitle">Admin Dashboard</div>
      <div className="pageSub">Overview of system activity and operational metrics.</div>

      <div className={styles.stats}>
        <StatCard label="Total Users" value="128" icon={<FiUsers />} iconTone="blue" />
        <StatCard label="Total Products" value="237" icon={<FiBox />} iconTone="purple" />
        <StatCard label="Revenue (This Week)" value="Rs 1,26,900" icon={<FiDollarSign />} iconTone="accent" />
        <StatCard label="Critical Alerts" value="5" icon={<FiAlertCircle />} iconTone="red" />
      </div>

      <div className={styles.grid}>
        <div className={`card ${styles.panel}`}>
          <div className={styles.panelHead}>Sales (Last 7 Days)</div>
          <div className={styles.chartBox}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="sales" fill="#e2ad00" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className={`card ${styles.panel}`}>
          <div className={styles.panelHead}>Recent Orders</div>
          <Table columns={cols} rows={rows} />
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
