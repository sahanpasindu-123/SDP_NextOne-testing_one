import { useEffect, useMemo, useState } from "react";
import { employeesAPI } from "../../../api/employees";
import { customersAPI } from "../../../api/customers";
import { FiSearch, FiEdit2, FiTrash2, FiUserPlus } from "react-icons/fi";
import Badge from "../../../components/Badge/Badge.jsx";
import Button from "../../../components/Button/Button.jsx";
import Tabs from "../../../components/Tabs/Tabs.jsx";
import Table from "../../../components/Table/Table.jsx";
import AddUserModal from "../../../components/modals/User/AddUserModal.jsx";
import UpdateUserModal from "../../../components/modals/User/UpdateUserModal.jsx";
import DeleteUserModal from "../../../components/modals/User/DeleteUserModal.jsx";
import styles from "./AdminUserManagement.module.css";

export default function AdminUserManagement() {
  const TABS = [
    { label: "Employees", value: "employees" },
    { label: "Customers", value: "customers" },
  ];

  const [activeTab, setActiveTab] = useState("employees");

  // Modal state
  const [addOpen, setAddOpen] = useState(false);
  const [updOpen, setUpdOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Data
  const [employees, setEmployees] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [errorEmployees, setErrorEmployees] = useState("");
  const [errorCustomers, setErrorCustomers] = useState("");

  const openAdd = () => setAddOpen(true);
  const openUpdate = (user) => {
    setSelectedUser(user);
    setUpdOpen(true);
  };
  const openDelete = (user) => {
    setSelectedUser(user);
    setDelOpen(true);
  };

  const unwrapList = (res) => {
    // supports: { success: true, data: [...] } OR plain array
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    return [];
  };

  const loadEmployees = async () => {
    try {
      setErrorEmployees("");
      setLoadingEmployees(true);
      const res = await employeesAPI.list();
      setEmployees(unwrapList(res));
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || "Failed to load employees";
      setErrorEmployees(msg);
      setEmployees([]);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const loadCustomers = async () => {
    try {
      setErrorCustomers("");
      setLoadingCustomers(true);
      const res = await customersAPI.getAll();
      setCustomers(unwrapList(res));
    } catch (err) {
      console.error(err);

      const status = err?.response?.status;
      const backendMsg = err?.response?.data?.message;

      // Requirement: if 401 Invalid token payload, report clearly
      if (status === 401 && String(backendMsg).toLowerCase().includes("invalid token payload")) {
        setErrorCustomers("Unauthorized: Invalid token payload");
      } else {
        setErrorCustomers(backendMsg || "Failed to load customers");
      }

      setCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  };

  useEffect(() => {
    loadEmployees();
    loadCustomers();
  }, []);

  // Employees view for table
  const employeeRows = useMemo(() => {
    return (employees || []).map((e, idx) => {
      const employeeId = e.employeeId ?? e.EmployeeID ?? e.id ?? "-";
      const name = e.name ?? e.Name ?? "-";
      const department = e.department ?? e.Department ?? "-";
      const role = e.role ?? e.Role ?? "-";

      const statusRaw =
        e.status ??
        e.Status ??
        (e.isActive === false ? "Inactive" : "Active");

      const status = String(statusRaw).toLowerCase().includes("in")
        ? "Inactive"
        : "Active";

      return {
        id: e.id ?? idx,
        employeeId,
        name,
        department,
        role,
        status,
        raw: e,
      };
    });
  }, [employees]);

  const customerRows = useMemo(() => {
    return (customers || []).map((c, idx) => {
      // Backend route currently maps to { id,name,email,phone,status }.
      // But requirement says columns should be CustomerID/Name/Email/Phone.
      const CustomerID = c.CustomerID ?? c.customerId ?? c.id ?? "-";
      const Name = c.Name ?? c.name ?? "-";
      const Email = c.Email ?? c.email ?? "-";
      const Phone = c.Phone ?? c.phone ?? "-";

      const statusRaw =
        c.status ??
        c.Status ??
        (c.isActive === false ? "Inactive" : "Active");

      const status = String(statusRaw).toLowerCase().includes("in")
        ? "Inactive"
        : "Active";

      return {
        id: c.id ?? CustomerID ?? idx,
        CustomerID,
        Name,
        Email,
        Phone,
        status,
        raw: c,
      };
    });
  }, [customers]);

  const employeeColumns = useMemo(
    () => [
      { key: "employeeId", header: "Employee ID" },
      { key: "name", header: "Name" },
      { key: "department", header: "Department" },
      { key: "role", header: "Role" },
      {
        key: "status",
        header: "Status",
        render: (r) =>
          r.status === "Active" ? (
            <Badge tone="success">Active</Badge>
          ) : (
            <Badge tone="danger">Inactive</Badge>
          ),
      },
    ],
    []
  );

  const customerColumns = useMemo(
    () => [
      { key: "CustomerID", header: "CustomerID" },
      { key: "Name", header: "Name" },
      { key: "Email", header: "Email" },
      { key: "Phone", header: "Phone" },
      {
        key: "status",
        header: "Status",
        render: (r) =>
          r.status === "Active" ? (
            <Badge tone="success">Active</Badge>
          ) : (
            <Badge tone="danger">Inactive</Badge>
          ),
      },
    ],
    []
  );

  // AddUserModal payload mapping:
  // employee -> { type, name, id, jobRole, password, confirmPassword }
  const handleAddSubmit = async (payload) => {
    try {
      if (!payload) return;

      if (payload.type !== "employee") {
        alert("Customer add flow not implemented yet");
        return;
      }

      if (!payload.id || !payload.password) {
        alert("Employee Id and Password are required");
        return;
      }

      if (payload.password !== payload.confirmPassword) {
        alert("Password and Confirm Password do not match");
        return;
      }

      const res = await employeesAPI.create({
        employeeId: payload.id,
        name: payload.name || "",
        role: payload.jobRole || "",
        email: null,
        password: payload.password,
      });

      if (res?.success === false) {
        alert(res?.message || "Failed to add employee");
        return;
      }

      alert("Employee added successfully");
      setAddOpen(false);
      await loadEmployees();
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || "Failed to add employee");
    }
  };

  const handleUpdateSubmit = (data) => {
    console.log("Update user:", data);
    setUpdOpen(false);
  };

  const handleDelete = () => {
    console.log("Delete user:", selectedUser?.name || selectedUser?.Name);
    setDelOpen(false);
  };

  return (
    <div className={styles.page}>
      <div className="pageTitle">User Management</div>
      <div className="pageSub">Create, manage and control users and roles.</div>

      <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

      <div className={`card ${styles.toolbar}`}>
        <div className={styles.search}>
          <FiSearch className={styles.sIcon} />
          <input placeholder="Search users..." />
        </div>
        <Button leftIcon={<FiUserPlus />} onClick={openAdd}>
          Add User
        </Button>
      </div>

      <div className={`card ${styles.table}`}>
        {activeTab === "employees" ? (
          <>
            {loadingEmployees ? (
              <div style={{ padding: 16 }}>Loading employees...</div>
            ) : errorEmployees ? (
              <div style={{ padding: 16, color: "#ef4444" }}>
                {errorEmployees}
              </div>
            ) : employeeRows.length === 0 ? (
              <div style={{ padding: 16 }}>No employees found</div>
            ) : (
              <Table columns={employeeColumns} rows={employeeRows} />
            )}
          </>
        ) : (
          <>
            {loadingCustomers ? (
              <div style={{ padding: 16 }}>Loading customers...</div>
            ) : errorCustomers ? (
              <div style={{ padding: 16, color: "#ef4444" }}>
                {errorCustomers}
              </div>
            ) : customerRows.length === 0 ? (
              <div style={{ padding: 16 }}>No customers found</div>
            ) : (
              <Table columns={customerColumns} rows={customerRows} />
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <AddUserModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSubmit={handleAddSubmit}
        defaultType="employee"
      />

      <UpdateUserModal
        open={updOpen}
        onClose={() => setUpdOpen(false)}
        onSubmit={handleUpdateSubmit}
        initial={selectedUser || undefined}
      />

      <DeleteUserModal
        open={delOpen}
        onClose={() => setDelOpen(false)}
        onDelete={handleDelete}
        userName={selectedUser?.name || selectedUser?.Name || ""}
      />
    </div>
  );
}
