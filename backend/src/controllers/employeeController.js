const bcrypt = require("bcryptjs");
const prisma = require("../utils/prisma");
const { writeAuditLog } = require("../utils/auditLog");

// ===============================
// Helpers
// ===============================

// Prisma enum: employee_Role
// Allowed values should match schema (commonly: COUNTER, SELLER, EMPLOYEE)
function normalizeRole(input) {
  const raw = String(input || "").trim().toUpperCase();

  // common mappings (frontend may send "counter", "seller", etc.)
  if (raw === "COUNTER") return "COUNTER";
  if (raw === "SELLER") return "SELLER";
  if (raw === "EMPLOYEE") return "EMPLOYEE";

  // fallback (avoid Prisma enum validation crash)
  return "EMPLOYEE";
}

function safeEmployeeIdFromToken(req) {
  // Depending on your auth middleware, token payload might be:
  // req.user.employeeId OR req.user.id
  const v = req.user?.employeeId ?? req.user?.id ?? "";
  return String(v || "");
}

// ===============================
// GET /api/employees
// ===============================
async function listEmployees(req, res) {
  try {
    // Use correct Prisma field names from schema: employeeId, name, role, isActive
    const employees = await prisma.employee.findMany({
      orderBy: { id: "desc" },
      select: {
        id: true,
        employeeId: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Frontend expects: { id, name, role, status, last }
    const data = employees.map((e) => ({
      id: e.id,
      employeeId: e.employeeId,
      name: e.name || "",
      // keep what UI expects (lowercase string is usually safer)
      role: String(e.role || "EMPLOYEE").toLowerCase(),
      status: e.isActive ? "Active" : "Inactive",
      last: e.createdAt ? new Date(e.createdAt).toLocaleString() : "-",
    }));

    return res.json({ success: true, data });
  } catch (err) {
    console.error("listEmployees error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to load employees",
    });
  }
}

// ===============================
// POST /api/employees
// Body: { employeeId, name, role, password }
// (Frontend sometimes sends jobRole instead of role)
// ===============================
async function createEmployee(req, res) {
  try {
    const body = req.body || {};

    // accept both keys (no frontend change)
    const employeeId = body.employeeId ?? body.id ?? body.EmployeeID;
    const name = body.name ?? body.Name ?? null;

    // accept role or jobRole (no frontend change)
    const roleInput = body.role ?? body.jobRole ?? body.Role;
    const role = normalizeRole(roleInput);

    const password = body.password;

    if (!employeeId || !password) {
      return res.status(400).json({
        success: false,
        message: "employeeId and password are required",
      });
    }

    // duplicate check using correct field name: employeeId (String)
    const existing = await prisma.employee.findUnique({
      where: { employeeId: String(employeeId) },
      select: { employeeId: true },
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: "Employee ID already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(String(password), 10);

    const created = await prisma.employee.create({
      data: {
        employeeId: String(employeeId),
        name: name,
        role: role, // ✅ enum-safe
        password: hashedPassword,
        department: null,
        isActive: true,
      },
      select: {
        id: true,
        employeeId: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    // ✅ Audit log (DO NOT log password/hash)
    await writeAuditLog(req, {
      action: "EMPLOYEE_CREATE",
      entityType: "employee",
      entityId: created.employeeId,
      before: null,
      after: {
        id: created.id,
        employeeId: created.employeeId,
        name: created.name,
        role: created.role,
        isActive: created.isActive,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Employee created successfully",
      data: {
        id: created.id,
        name: created.name || "",
        role: String(created.role || "EMPLOYEE").toLowerCase(),
        status: created.isActive ? "Active" : "Inactive",
        last: created.createdAt ? new Date(created.createdAt).toLocaleString() : "-",
      },
    });
  } catch (err) {
    console.error("createEmployee error:", err);

    // Prisma enum/validation errors are usually clear enough via err.message
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to create employee",
    });
  }
}

// ===============================
// POST /api/employees/change-password
// Body: { currentPassword, newPassword }
// ===============================
async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body || {};

    // 1) Basic validations
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "currentPassword and newPassword are required",
      });
    }

    // 2) Get logged-in employee id from token
    const employeeId = safeEmployeeIdFromToken(req);
    if (!employeeId) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    // 3) Find employee
    const employee = await prisma.employee.findUnique({
      where: { employeeId },
      select: { employeeId: true, password: true, role: true, isActive: true },
    });

    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    if (employee.isActive === false) {
      return res.status(403).json({ success: false, message: "Employee account is inactive" });
    }

    // 4) Check current password
    const ok = await bcrypt.compare(String(currentPassword), employee.password);
    if (!ok) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // 5) Simple password rule
    if (String(newPassword).length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters",
      });
    }

    // 6) Hash & update
    const hashed = await bcrypt.hash(String(newPassword), 10);

    await prisma.employee.update({
      where: { employeeId },
      data: { password: hashed },
    });

    // ✅ Audit log (do not log passwords)
    await writeAuditLog(req, {
      action: "EMPLOYEE_PASSWORD_CHANGE",
      entityType: "employee",
      entityId: employeeId,
      before: null,
      after: null,
      meta: { note: "password changed (hash not logged)" },
    });

    return res.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (err) {
    console.error("changePassword error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to update password",
    });
  }
}

module.exports = {
  listEmployees,
  createEmployee,
  changePassword,
};
