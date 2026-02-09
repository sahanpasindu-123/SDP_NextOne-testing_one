import { FiSearch, FiEdit2, FiTrash2, FiPlus } from 'react-icons/fi'
import { useState, useEffect, useMemo } from 'react'
import { customersAPI } from '../../api/customers'
import Badge from '../../components/Badge/Badge.jsx'
import styles from './Customers.module.css'

export default function Customers() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchText, setSearchText] = useState("")
  const [statusFilter, setStatusFilter] = useState("ALL") // ALL | ACTIVE | INACTIVE
  const [roleFilter, setRoleFilter] = useState("ALL") // ALL | VERIFIED | UNVERIFIED


  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        setLoading(true)
        console.log("🔍 [Customers] Fetching customers from API");
        const response = await customersAPI.getCustomers()
        console.log("✅ [Customers] API response:", response);

        // Handle both old and new response formats
        let customersData = [];

        if (response.success && response.data) {
          // New format: {success: true, data: [...]}
          customersData = response.data;
        } else if (Array.isArray(response)) {
          // Old format: plain array
          customersData = response;
        } else {
          // Fallback
          customersData = response.data || [];
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
          phone: customer.phone || customer.Phone || "—",

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


        console.log("✅ [Customers] Mapped rows:", mappedRows);
        setRows(mappedRows)
      } catch (err) {
        console.error("❌ [Customers] Error fetching customers:", err);
        setError('Failed to load customers')
      } finally {
        setLoading(false)
      }
    }

    fetchCustomers()
  }, [])

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

  return (
    <div className={styles.page}>
      <div className="pageTitle">Customer Management</div>

      <div className={styles.hero}>
        <div className={styles.heroTop}>
          <div className={styles.h1}>Customer Management</div>
          <button
            className={styles.addBtn}
            onClick={async () => {
              try {
                const name = window.prompt("Customer name?")
                if (!name) return
                const email = window.prompt("Customer email?")
                if (!email) return
                const phone = window.prompt("Customer phone? (optional)") || ""

                await customersAPI.createCustomer({ name, email, phone })
                alert("Customer added")
                // re-fetch list
                setLoading(true)
                const response = await customersAPI.getCustomers()
                const customersData = response?.data || response?.data?.data || response?.data || []
                // easiest: reload page state by triggering fetch again
                window.location.reload()
              } catch (e) {
                console.error(e)
                alert(e?.response?.data?.message || "Add customer failed")
              }
            }}
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
              {roleFilter === "ALL" ? "All Customers" : roleFilter} ˅
            </button>
            <button
              className={styles.dd}
              onClick={() => {
                const order = ["ALL", "ACTIVE", "INACTIVE"]
                const i = order.indexOf(statusFilter)
                setStatusFilter(order[(i + 1) % order.length])
              }}
            >
              {statusFilter === "ALL" ? "All Status" : statusFilter} ˅
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
                    onClick={async () => {
                      try {
                        if (!r.id) return alert("Missing customer id")

                        const newName = window.prompt("New name:", r.name) ?? r.name
                        const newPhone = window.prompt("New phone:", r.phone) ?? r.phone
                        const active = window.confirm("Set customer as ACTIVE?\nOK = Active, Cancel = Inactive")

                        await customersAPI.updateCustomer(r.id, {
                          name: newName,
                          phone: newPhone,
                          // Backend expects status: "Active" | "Inactive"
                          status: active ? "Active" : "Inactive",
                        })

                        alert("Customer updated")
                        // reload list quickly
                        window.location.reload()
                      } catch (e) {
                        console.error(e)
                        alert(e?.response?.data?.message || "Update failed")
                      }
                    }}
                  >
                    <FiEdit2 />
                  </button>
                  <button
                    className={`${styles.iconBtn} ${styles.trash}`}
                    aria-label="Delete"
                    onClick={async () => {
                      try {
                        if (!r.id) return alert("Missing customer id")
                        const ok = window.confirm(`Delete customer "${r.name}"?`)
                        if (!ok) return

                        await customersAPI.deleteCustomer(r.id)
                        alert("Customer deleted")
                        // remove locally without full reload
                        setRows((prev) => prev.filter((x) => x.id !== r.id))
                      } catch (e) {
                        console.error(e)
                        alert(e?.response?.data?.message || "Delete failed")
                      }
                    }}
                  >
                    <FiTrash2 />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
