import { useEffect, useMemo, useState, useRef } from "react";
import { employeesAPI } from "../../../api/employees";
import { customersAPI } from "../../../api/customers";
import axiosClient from "../../../api/axiosClient";
import { FiSearch, FiEdit2, FiTrash2, FiUserPlus } from "react-icons/fi";
import Badge from "../../../components/Badge/Badge.jsx";
import Button from "../../../components/Button/Button.jsx";
import Tabs from "../../../components/Tabs/Tabs.jsx";
import Table from "../../../components/Table/Table.jsx";
import AddUserModal from "../../../components/modals/User/AddUserModal.jsx";
import UpdateUserModal from "../../../components/modals/User/UpdateUserModal.jsx";
import DeleteUserModal from "../../../components/modals/User/DeleteUserModal.jsx";
import toast from "react-hot-toast";
import styles from "./AdminUserManagement.module.css";

export default function AdminUserManagement() {
  const isMountedRef = useRef(true);
  const TABS = [
    { label: "Employees", value: "employees" },
    { label: "Customers", value: "customers" },
  ];

  const [activeTab, setActiveTab] = useState("employees");
  const [searchText, setSearchText] = useState("");

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

  const closeUserModals = () => {
    setAddOpen(false);
    setUpdOpen(false);
    setDelOpen(false);
  };

  const openAdd = () => {
    closeUserModals();
    setSelectedUser(null);
    setAddOpen(true);
  };
  const openUpdate = (user) => {
    closeUserModals();
    setSelectedUser(user);
    setUpdOpen(true);
  };
  const openDelete = (user) => {
    closeUserModals();
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
      if (!isMountedRef.current) return;
      setEmployees(unwrapList(res));
    } catch (err) {
      console.error(err);
      const msg = err?.response?.data?.message || "Failed to load employees";
      if (isMountedRef.current) {
        setErrorEmployees(msg);
        setEmployees([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoadingEmployees(false);
      }
    }
  };

  const loadCustomers = async () => {
    try {
      setErrorCustomers("");
      setLoadingCustomers(true);
      const res = await customersAPI.getAll();
      if (!isMountedRef.current) return;
      setCustomers(unwrapList(res));
    } catch (err) {
      console.error(err);

      const status = err?.response?.status;
      const backendMsg = err?.response?.data?.message;

      // Requirement: if 401 Invalid token payload, report clearly
      if (status === 401 && String(backendMsg).toLowerCase().includes("invalid token payload")) {
        if (isMountedRef.current) {
          setErrorCustomers("Unauthorized: Invalid token payload");
        }
      } else {
        if (isMountedRef.current) {
          setErrorCustomers(backendMsg || "Failed to load customers");
        }
      }

      if (isMountedRef.current) {
        setCustomers([]);
      }
    } finally {
      if (isMountedRef.current) {
        setLoadingCustomers(false);
      }
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    loadEmployees();
    loadCustomers();
    return () => {
      isMountedRef.current = false;
    };
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

  const actionColumn = useMemo(
    () => ({
      key: "actions",
      header: "Actions",
      width: 120,
      render: (r) => (
        <div className={styles.actions}>
          <button
            type="button"
            title="Edit"
            onClick={() => openUpdate(r)}
            className={`${styles.iconBtn} ${styles.edit}`}
          >
            <FiEdit2 />
          </button>
          <button
            type="button"
            title="Delete"
            onClick={() => openDelete(r)}
            className={`${styles.iconBtn} ${styles.trash}`}
          >
            <FiTrash2 />
          </button>
        </div>
      ),
    }),
    []
  );

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
      actionColumn,
    ],
    [actionColumn]
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
      actionColumn,
    ],
    [actionColumn]
  );

  const filteredEmployeeRows = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return employeeRows;
    return employeeRows.filter((r) =>
      [r.employeeId, r.name, r.department, r.role]
        .map((v) => String(v || "").toLowerCase())
        .some((v) => v.includes(q))
    );
  }, [employeeRows, searchText]);

  const filteredCustomerRows = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    if (!q) return customerRows;
    return customerRows.filter((r) =>
      [r.CustomerID, r.Name, r.Email, r.Phone]
        .map((v) => String(v || "").toLowerCase())
        .some((v) => v.includes(q))
    );
  }, [customerRows, searchText]);

  const selectedInitial = useMemo(() => {
    if (!selectedUser) return undefined;
    if (activeTab === "employees") {
      return {
        type: "employee",
        name: selectedUser?.name || selectedUser?.raw?.name || selectedUser?.raw?.Name || "",
        id: selectedUser?.employeeId || selectedUser?.raw?.employeeId || selectedUser?.raw?.EmployeeID || "",
        jobRole: selectedUser?.role || selectedUser?.raw?.role || selectedUser?.raw?.Role || "",
        status: selectedUser?.status || "Inactive",
      };
    }
    return {
      type: "customer",
      name: selectedUser?.Name || selectedUser?.name || selectedUser?.raw?.Name || "",
      email: selectedUser?.Email || selectedUser?.email || selectedUser?.raw?.Email || "",
      contactNumber: selectedUser?.Phone || selectedUser?.phone || selectedUser?.raw?.Phone || "",
      status: selectedUser?.status || "Inactive",
    };
  }, [selectedUser, activeTab]);

  // AddUserModal payload mapping:
  // employee -> { type, name, id, jobRole, password, confirmPassword }
  const handleAddSubmit = async (payload) => {
    try {
      if (!payload) return;

      const type = payload.type === "customer" ? "customer" : "employee";

      if (!payload.password) return toast.error("Password is required");

      if (payload.password !== payload.confirmPassword) {
        toast.error("Password and Confirm Password do not match");
        return;
      }

      if (type === "employee") {
        if (!payload.id) return toast.error("Employee Id is required");

        const res = await employeesAPI.create({
          employeeId: payload.id,
          name: payload.name || "",
          role: payload.jobRole || "",
          email: null,
          password: payload.password,
        });

        if (res?.success === false) {
          toast.error(res?.message || "Failed to add employee");
          return;
        }

        toast.success("Employee added successfully");
        if (!isMountedRef.current) return;
        setAddOpen(false);
        await loadEmployees();
        return;
      }

      if (!payload.email) return toast.error("Email is required");
      if (!payload.contactNumber || !String(payload.contactNumber).trim()) {
        return toast.error("Contact number is required");
      }

      const res = await customersAPI.createCustomer({
        name: payload.name || "",
        email: payload.email,
        phone: String(payload.contactNumber).trim(),
        password: payload.password,
      });

      if (res?.success === false) {
        toast.error(res?.message || "Failed to add customer");
        return;
      }

      toast.success("Customer added successfully");
      if (!isMountedRef.current) return;
      setAddOpen(false);
      await loadCustomers();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || err?.response?.data?.message || "Failed to add user");
    }
  };

  const getSelectedAdminId = (type) => {
    if (!selectedUser) return null;
    if (type === "customer") {
      return (
        selectedUser?.raw?.CustomerID ??
        selectedUser?.raw?.customerId ??
        selectedUser?.CustomerID ??
        selectedUser?.raw?.id ??
        selectedUser?.id ??
        null
      );
    }
    return (
      selectedUser?.raw?.id ??
      selectedUser?.raw?.EmployeeID ??
      selectedUser?.raw?.employeeId ??
      selectedUser?.employeeId ??
      selectedUser?.id ??
      null
    );
  };

  const handleUpdateSubmit = async (data) => {
    try {
      if (!data) return;
      const type = data.type === "customer" ? "customer" : "employee";
      const id = getSelectedAdminId(type);
      if (!id) return toast.error("User id not found");

      await axiosClient.put(`/admin/users/${id}`, { ...data, type });

      if (!isMountedRef.current) return;
      setUpdOpen(false);
      setSelectedUser(null);
      if (type === "employee") await loadEmployees();
      else await loadCustomers();
      toast.success("User updated successfully");
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Update failed");
    }
  };

  const handleDelete = async () => {
    try {
      const type = activeTab === "customers" ? "customer" : "employee";
      const id = getSelectedAdminId(type);
      if (!id) return toast.error("User id not found");

      await axiosClient.delete(`/admin/users/${id}`, { params: { type } });

      if (!isMountedRef.current) return;

      if (type === "employee") {
        setEmployees((prev) =>
          (Array.isArray(prev) ? prev : []).filter(
            (e) => String(e?.id ?? e?.employeeId ?? "") !== String(id)
          )
        );
      } else {
        setCustomers((prev) =>
          (Array.isArray(prev) ? prev : []).filter(
            (c) => String(c?.CustomerID ?? c?.customerId ?? c?.id ?? "") !== String(id)
          )
        );
      }

      setDelOpen(false);
      setSelectedUser(null);
      toast.success("User deleted successfully");
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Delete failed");
    }
  };

  return (
    <div className={styles.page}>
      <div className="pageTitle">User Management</div>
      <div className="pageSub">Create, manage and control users and roles.</div>

      <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

      <div className={`card ${styles.toolbar}`}>
        <div className={styles.search}>
          <FiSearch className={styles.sIcon} />
          <input
            placeholder="Search users..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
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
              <Table columns={employeeColumns} rows={filteredEmployeeRows} />
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
              <Table columns={customerColumns} rows={filteredCustomerRows} />
            )}
          </>
        )}
      </div>

      {/* Modals */}
      <AddUserModal
        open={addOpen}
        onClose={() => {
          setAddOpen(false);
          setSelectedUser(null);
        }}
        onSubmit={handleAddSubmit}
        defaultType="employee"
      />

      <UpdateUserModal
        open={updOpen}
        onClose={() => {
          setUpdOpen(false);
          setSelectedUser(null);
        }}
        onSubmit={handleUpdateSubmit}
        initial={selectedInitial}
      />

      <DeleteUserModal
        open={delOpen}
        onClose={() => {
          setDelOpen(false);
          setSelectedUser(null);
        }}
        onDelete={handleDelete}
        userName={selectedUser?.name || selectedUser?.Name || selectedUser?.raw?.name || selectedUser?.raw?.Name || ""}
      />
    </div>
  );
}
