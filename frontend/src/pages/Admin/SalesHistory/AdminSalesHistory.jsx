import { useState } from 'react'
import { FiDownload } from 'react-icons/fi'
import Table from '../../../components/Table/Table.jsx'
import Button from '../../../components/Button/Button.jsx'
import Badge from '../../../components/Badge/Badge.jsx'
import ExportSalesReportModal from '../../../components/modals/Reports/ExportSalesReportModal.jsx'
import styles from './AdminSalesHistory.module.css'

const rows = [
  { id:'INV-001', customer:'ABC Construction', date:'2023-06-15', amount:'Rs 28,750', payment:'Cash', status:'Paid' },
  { id:'INV-002', customer:'XYZ Contractors', date:'2023-06-14', amount:'Rs 12,400', payment:'Card', status:'Paid' },
  { id:'INV-003', customer:'Metro Builders', date:'2023-06-14', amount:'Rs 9,850', payment:'Cash', status:'Pending' },
]

export default function AdminSalesHistory() {
  // Modal state
  const [exportOpen, setExportOpen] = useState(false)
  const [timePeriod, setTimePeriod] = useState("Last 30 Days")
  const [reportType, setReportType] = useState("Detailed Report")

  // Modal handlers
  const handleExport = () => setExportOpen(true)
  const cols = [
    { key:'id', header:'Invoice ID', width:120, render:(r)=> <span className={styles.id}>{r.id}</span> },
    { key:'customer', header:'Customer' },
    { key:'date', header:'Date', width:160 },
    { key:'amount', header:'Amount', width:140 },
    { key:'payment', header:'Payment', width:140, render:(r)=> <Badge tone="success">{r.payment}</Badge> },
    { key:'status', header:'Status', width:140, render:(r)=> r.status==='Paid' ? <Badge tone="success">Paid</Badge> : <Badge tone="warn">Pending</Badge> },
  ]
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
          console.log("EXPORT SALES REPORT", data);
          setExportOpen(false);
        }}
      />
    </div>
  )
}
