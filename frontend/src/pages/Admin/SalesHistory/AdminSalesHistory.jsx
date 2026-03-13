import { useEffect, useRef, useState } from 'react'
import { FiDownload } from 'react-icons/fi'
import Table from '../../../components/Table/Table.jsx'
import Button from '../../../components/Button/Button.jsx'
import Badge from '../../../components/Badge/Badge.jsx'
import ExportSalesReportModal from '../../../components/modals/Reports/ExportSalesReportModal.jsx'
import { reportsAPI } from '../../../api/reports'
import styles from './AdminSalesHistory.module.css'

const toPaidPending = (raw) => {
  const s = String(raw || '').toUpperCase()
  if (s.includes('PAID') || s.includes('COMPLETE')) return 'Paid'
  return 'Pending'
}

const escapeCsvCell = (v) => {
  const s = String(v ?? '')
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

export default function AdminSalesHistory() {
  const isMountedRef = useRef(true)

  // Modal state
  const [exportOpen, setExportOpen] = useState(false)
  const [timePeriod, setTimePeriod] = useState("Last 30 Days")
  const [reportType, setReportType] = useState("Detailed Report")
  const [rows, setRows] = useState([])

  const fetchSales = async () => {
    try {
      const now = new Date()
      const to = now.toISOString().slice(0, 10)
      const fromDate = new Date(now)
      fromDate.setDate(now.getDate() - 30)
      const from = fromDate.toISOString().slice(0, 10)

      const res = await reportsAPI.getSalesReport({ from, to })
      const list = Array.isArray(res?.data) ? res.data : []

      const mapped = list.map((r) => ({
        id: r?.id ?? 'N/A',
        customer: r?.customer ?? 'N/A',
        date: r?.date ?? 'N/A',
        amount: r?.amount ?? 'Rs 0',
        status: toPaidPending(r?.status),
      }))

      if (!isMountedRef.current) return
      setRows(mapped)
    } catch (err) {
      console.error('[AdminSalesHistory] Failed to load sales report:', err)
      if (isMountedRef.current) setRows([])
    }
  }

  // Modal handlers
  const handleExport = () => setExportOpen(true)
  const cols = [
    { key:'id', header:'Invoice ID', width:120, render:(r)=> <span className={styles.id}>{r.id}</span> },
    { key:'customer', header:'Customer' },
    { key:'date', header:'Date', width:160 },
    { key:'amount', header:'Amount', width:140 },
    { key:'status', header:'Status', width:140, render:(r)=> r.status==='Paid' ? <Badge tone="success">Paid</Badge> : <Badge tone="warn">Pending</Badge> },
  ]

  useEffect(() => {
    isMountedRef.current = true
    fetchSales()
    return () => {
      isMountedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportCsv = ({ timePeriod: tp } = {}) => {
    const header = ['Invoice ID', 'Customer', 'Date', 'Amount', 'Status']
    const body = (Array.isArray(rows) ? rows : []).map((r) =>
      [
        r?.id,
        r?.customer,
        r?.date,
        r?.amount,
        r?.status,
      ]
        .map(escapeCsvCell)
        .join(',')
    )

    const safeTp = String(tp || timePeriod || 'sales').replace(/[^\w.-]+/g, '_')
    const filename = `sales-history_${safeTp}.csv`
    downloadFile([header.join(','), ...body].join('\n'), filename, 'text/csv;charset=utf-8')
  }

  return (
    <div className={styles.page}>
      <div className="pageTitle">Sales History</div>
      <div className="pageSub">View and export historical sales transactions.</div>

      <div className={`card ${styles.toolbar}`}>
        <Button leftIcon={<FiDownload />} onClick={handleExport}>Export</Button>
        <div className={styles.range}>Date Range: <strong>Last 30 days</strong></div>
      </div>

      <div className={`card ${styles.tableCard}`}>
        <div className={styles.tableHead}>Invoices</div>
        <Table columns={cols} rows={rows} />
      </div>

      {/* Export Sales Report Modal */}
      <ExportSalesReportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        timePeriod={timePeriod}
        setTimePeriod={setTimePeriod}
        reportType={reportType}
        setReportType={setReportType}
        onExport={(data) => {
          exportCsv(data)
          setExportOpen(false);
        }}
      />
    </div>
  )
}
