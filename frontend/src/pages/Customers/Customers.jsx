import { FiSearch, FiEdit2, FiTrash2, FiPlus } from 'react-icons/fi'
import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { customersAPI } from '../../api/customers'
import Badge from '../../components/Badge/Badge.jsx'
import Modal from '../../components/Modal/Modal.jsx'
import Button from '../../components/Button/Button.jsx'
import styles from './Customers.module.css'
import toast from "react-hot-toast";

export default function Customers() {
  const isMountedRef = useRef(true)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchText, setSearchText] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL") // ALL | ACTIVE | INACTIVE
  const [roleFilter, setRoleFilter] = useState("ALL") // ALL | VERIFIED | UNVERIFIED
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState("add") // add | edit
  const [formSaving, setFormSaving] = useState(false)
  const [formTarget, setFormTarget] = useState(null)
  const [formName, setFormName] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formPhone, setFormPhone] = useState("")
  const [formStatus, setFormStatus] = useState("Active")
  const [deleteTarget, setDeleteTarget] = useState(null)


  const fetchCustomers = useCallback(async () => {
    try {
      setLoading(true)
      console.log("[Customers] Fetching customers from API")
      const response = await customersAPI.getCustomers()
      console.log("[Customers] API response:", response)

      // Handle both old and new response formats
      let customersData = []

      if (response?.success && Array.isArray(response.data)) {
        // New format: {success: true, data: [...]}
        customersData = response.data
      } else if (Array.isArray(response)) {
        // Old format: plain array
        customersData = response
      } else if (Array.isArray(response?.data?.data)) {
        customersData = response.data.data
      } else if (Array.isArray(response?.data)) {
        customersData = response.data
      } else {
        // Fallback
        customersData = []
      }

      // Map API response to the expected format
      const mappedRows = customersData.map((customer) => ({
        id:
          customer.id ||
          customer.CustomerID ||
          customer.customerId ||
          customer.customerID,

        name: customer.name || customer.Name || "Unknown",
        email: customer.email || customer.Email || "No email",
        phone: customer.phone || customer.Phone || "N/A",

        status:
          customer.isActive === false || customer.status === "Inactive"
            ? "Inactive"
            : "Active",

        verified:
          customer.emailVerified === true ||
          customer.verified === true ||
          customer.isVerified === true,

        last:
          customer.lastLogin ||
          customer.last ||
          customer.updatedAt ||
          customer.UpdatedAt ||
          "Never",
      }))

      console.log("[Customers] Mapped rows:", mappedRows)
      if (!isMountedRef.current) return
      setRows(mappedRows)
    } catch (err) {
      console.error("[Customers] Error fetching customers:", err)
      if (isMountedRef.current) {
        setError('Failed to load customers')
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    fetchCustomers()
    return () => {
      isMountedRef.current = false
    }
  }, [fetchCustomers])


  const filteredRows = useMemo(() => {
    const q = searchText.trim().toLowerCase()

    return rows.filter((r) => {
      // search
      const matchesSearch =
        !q ||
        String(r.name).toLowerCase().includes(q) ||
        String(r.email).toLowerCase().includes(q) ||
        String(r.phone).toLowerCase().includes(q)

      // status filter
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "ACTIVE" && r.status === "Active") ||
        (statusFilter === "INACTIVE" && r.status === "Inactive")

      // role filter (we use verified/unverified instead of "role")
      const matchesRole =
        roleFilter === "ALL" ||
        (roleFilter === "VERIFIED" && r.verified === true) ||
        (roleFilter === "UNVERIFIED" && r.verified === false)

      return matchesSearch && matchesStatus && matchesRole
    })
  }, [rows, searchText, statusFilter, roleFilter])

  const openAdd = () => {
    setFormMode("add")
    setFormTarget(null)
    setFormName("")
    setFormEmail("")
    setFormPhone("")
    setFormStatus("Active")
    setFormOpen(true)
  }

  const openEdit = (row) => {
    setFormMode("edit")
    setFormTarget(row)
    setFormName(row?.name || "")
    setFormEmail(row?.email || "")
    setFormPhone(row?.phone === "N/A" ? "" : (row?.phone || ""))
    setFormStatus(row?.status === "Inactive" ? "Inactive" : "Active")
    setFormOpen(true)
  }

  const closeForm = () => {
    if (formSaving) return
    setFormOpen(false)
  }

  const submitForm = async () => {
    if (formSaving) return
    const name = String(formName || "").trim()
    const email = String(formEmail || "").trim()
    const phone = String(formPhone || "").trim()

    if (!name) return toast.error("Customer name is required")
    if (formMode === "add" && !email) return toast.error("Customer email is required")

    try {
      setFormSaving(true)
      if (formMode === "add") {
        await customersAPI.createCustomer({ name, email, phone })
        toast.success("Customer added")
      } else {
        const id = formTarget?.id
        if (!id) return toast.error("Missing customer id")
        await customersAPI.updateCustomer(id, {
          name,
          phone,
          status: formStatus === "Inactive" ? "Inactive" : "Active",
        })
        toast.success("Customer updated")
      }

      setFormOpen(false)
      await fetchCustomers()
    } catch (e) {
      console.error(e)
      toast.error(e?.response?.data?.message || (formMode === "add" ? "Add customer failed" : "Update failed"))
    } finally {
      if (isMountedRef.current) setFormSaving(false)
    }
  }

  const confirmDelete = async () => {
    const row = deleteTarget
    if (!row?.id) return
    try {
      await customersAPI.deleteCustomer(row.id)
      toast.success("Customer deleted")
      if (!isMountedRef.current) return
      setRows((prev) => (Array.isArray(prev) ? prev.filter((x) => x.id !== row.id) : prev))
      setDeleteTarget(null)
    } catch (e) {
      console.error(e)
      toast.error(e?.response?.data?.message || "Delete failed")
    }
  }

  return (
    <div className={styles.page}>
      <div className="pageTitle">Customer Management</div>

      <div className={styles.hero}>
        <div className={styles.heroTop}>
          <div className={styles.h1}>Customer Management</div>
          <button
            className={styles.addBtn}
            onClick={openAdd}
          >
            <FiPlus /> Add Customer
          </button>
        </div>

        <div className={`card ${styles.panel}`}>
          <div className={styles.filters}>
            <div className={styles.search}>
              <FiSearch className={styles.sIcon} />
              <input
                placeholder="Search customers..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />

            </div>
            <button
              className={styles.dd}
              onClick={() => {
                const order = ["ALL", "VERIFIED", "UNVERIFIED"]
                const i = order.indexOf(roleFilter)
                setRoleFilter(order[(i + 1) % order.length])
              }}
            >
              {roleFilter === "ALL" ? "All Customers" : roleFilter} v
            </button>
            <button
              className={styles.dd}
              onClick={() => {
                const order = ["ALL", "ACTIVE", "INACTIVE"]
                const i = order.indexOf(statusFilter)
                setStatusFilter(order[(i + 1) % order.length])
              }}
            >
              {statusFilter === "ALL" ? "All Status" : statusFilter} v
            </button>

          </div>

          <div className={styles.table}>
            <div className={styles.tHead}>
              <div>User</div>
              <div>STATUS</div>
              <div>LAST LOGIN</div>
              <div style={{ textAlign: 'right' }}>ACTIONS</div>
            </div>

            {filteredRows.map((r, idx) => (
              <div key={idx} className={styles.tRow}>
                <div className={styles.userCell}>
                  <div className={styles.avatar}>S</div>
                  <div>
                    <div className={styles.uName}>{r.name}</div>
                    <div className={styles.uEmail}>{r.email}</div>
                  </div>
                </div>

                <div>
                  {r.status === 'Active'
                    ? <Badge tone="success">Active</Badge>
                    : <Badge tone="danger">Inactive</Badge>
                  }
                </div>

                <div className={styles.last}>{r.last}</div>

                <div className={styles.actions}>
                  <button
                    className={`${styles.iconBtn} ${styles.edit}`}
                    aria-label="Edit"
                    onClick={() => openEdit(r)}
                  >
                    <FiEdit2 />
                  </button>
                  <button
                    className={`${styles.iconBtn} ${styles.trash}`}
                    aria-label="Delete"
                    onClick={() => setDeleteTarget(r)}
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Modal
        open={formOpen}
        title={formMode === "edit" ? "Edit Customer" : "Add Customer"}
        onClose={closeForm}
        width={560}
      >
        <div className={styles.modalForm}>
          <div className={styles.field}>
            <div className={styles.fieldLabel}>Name</div>
            <input
              className={styles.fieldInput}
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Customer name"
              disabled={formSaving}
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <div className={styles.fieldLabel}>Email</div>
            <input
              className={styles.fieldInput}
              value={formEmail}
              onChange={(e) => setFormEmail(e.target.value)}
              placeholder="customer@example.com"
              disabled={formSaving || formMode === "edit"}
            />
          </div>

          <div className={styles.field}>
            <div className={styles.fieldLabel}>Phone (optional)</div>
            <input
              className={styles.fieldInput}
              value={formPhone}
              onChange={(e) => setFormPhone(e.target.value)}
              placeholder="Phone number"
              disabled={formSaving}
            />
          </div>

          {formMode === "edit" ? (
            <div className={styles.field}>
              <div className={styles.fieldLabel}>Status</div>
              <select
                className={styles.fieldInput}
                value={formStatus}
                onChange={(e) => setFormStatus(e.target.value)}
                disabled={formSaving}
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          ) : null}

          <div className={styles.modalActions}>
            <Button variant="secondary" onClick={closeForm} disabled={formSaving}>
              Cancel
            </Button>
            <Button onClick={submitForm} disabled={formSaving}>
              {formSaving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!deleteTarget}
        title="Delete Customer"
        onClose={() => setDeleteTarget(null)}
        width={520}
      >
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ color: "#334155", fontWeight: 700 }}>
            Delete customer <span style={{ fontWeight: 900 }}>{deleteTarget?.name}</span>?
          </div>
          <div style={{ color: "#64748b", fontSize: 13 }}>
            This action cannot be undone.
          </div>
          <div className={styles.modalActions}>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button onClick={confirmDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
