const prisma = require("../utils/prisma");

async function listAllUsers(req, res) {
  try {
    const [admins, employees, customers] = await Promise.all([
      prisma.admin.findMany(),
      prisma.employee.findMany(),
      prisma.customer.findMany(),
    ]);

    return res.json({
      success: true,
      data: [
        ...admins.map(a => ({
          id: a.AdminID,
          role: "ADMIN",
        })),
        ...employees.map(e => ({
          id: e.employeeId,
          role: "EMPLOYEE",
        })),
        ...customers.map(c => ({
          id: c.CustomerID,
          role: "CUSTOMER",
        })),
      ],
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function updateUser(req, res) {
  try {
    const type = String(req.body?.type || req.query?.type || "").toLowerCase();
    const idParam = String(req.params?.id || "").trim();

    if (!type) {
      return res.status(400).json({ success: false, message: "type is required" });
    }

    if (type === "customer") {
      const customerId = Number(idParam);
      if (!Number.isFinite(customerId) || customerId <= 0) {
        return res.status(400).json({ success: false, message: "Invalid customer id" });
      }

      const name = req.body?.name;
      const email = req.body?.email;
      const contactNumber = req.body?.contactNumber ?? req.body?.phone;
      const status = req.body?.status;

      const data = {};
      if (name !== undefined) data.Name = String(name || "");
      if (email !== undefined) data.Email = String(email || "").trim().toLowerCase();
      if (contactNumber !== undefined) data.Phone = String(contactNumber || "");
      if (status !== undefined) data.isActive = String(status || "").toLowerCase() === "active";

      const updated = await prisma.customer.update({
        where: { CustomerID: customerId },
        data,
        select: {
          CustomerID: true,
          Name: true,
          Email: true,
          Phone: true,
          isActive: true,
          UpdatedAt: true,
        },
      });

      return res.json({
        success: true,
        data: {
          id: updated.CustomerID,
          name: updated.Name,
          email: updated.Email,
          phone: updated.Phone,
          status: updated.isActive ? "Active" : "Inactive",
          last: updated.UpdatedAt,
        },
      });
    }

    if (type === "employee") {
      const employeePk = Number(idParam);
      const lookupByPk = Number.isFinite(employeePk) && employeePk > 0;

      const existing = lookupByPk
        ? await prisma.employee.findUnique({ where: { id: employeePk } })
        : await prisma.employee.findUnique({ where: { employeeId: idParam } });

      if (!existing) {
        return res.status(404).json({ success: false, message: "Employee not found" });
      }

      const name = req.body?.name;
      const role = req.body?.jobRole ?? req.body?.role;
      const status = req.body?.status;
      const newEmployeeId = req.body?.id ?? req.body?.employeeId;

      const data = {};
      if (name !== undefined) data.name = String(name || "");
      if (role !== undefined) data.role = String(role || "employee");
      if (status !== undefined) data.isActive = String(status || "").toLowerCase() === "active";

      if (newEmployeeId && String(newEmployeeId) !== String(existing.employeeId)) {
        const next = String(newEmployeeId).trim();
        if (next) {
          const dup = await prisma.employee.findUnique({ where: { employeeId: next } });
          if (dup) {
            return res.status(409).json({ success: false, message: "Employee ID already exists" });
          }
          data.employeeId = next;
        }
      }

      const updated = await prisma.employee.update({
        where: { id: existing.id },
        data,
        select: {
          id: true,
          employeeId: true,
          name: true,
          role: true,
          isActive: true,
          updatedAt: true,
        },
      });

      return res.json({
        success: true,
        data: {
          id: updated.id,
          employeeId: updated.employeeId,
          name: updated.name,
          role: String(updated.role || "employee"),
          status: updated.isActive ? "Active" : "Inactive",
          last: updated.updatedAt,
        },
      });
    }

    return res.status(400).json({ success: false, message: "Invalid type" });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function deleteUser(req, res) {
  try {
    const type = String(req.body?.type || req.query?.type || "").toLowerCase();
    const idParam = String(req.params?.id || "").trim();

    if (!type) {
      return res.status(400).json({ success: false, message: "type is required" });
    }

    if (type === "customer") {
      const customerId = Number(idParam);
      if (!Number.isFinite(customerId) || customerId <= 0) {
        return res.status(400).json({ success: false, message: "Invalid customer id" });
      }

      try {
        await prisma.customer.delete({ where: { CustomerID: customerId } });
      } catch (err) {
        await prisma.customer.update({
          where: { CustomerID: customerId },
          data: { isActive: false },
        });
      }

      return res.json({ success: true, message: "Customer deleted" });
    }

    if (type === "employee") {
      const employeePk = Number(idParam);
      const lookupByPk = Number.isFinite(employeePk) && employeePk > 0;

      const existing = lookupByPk
        ? await prisma.employee.findUnique({ where: { id: employeePk } })
        : await prisma.employee.findUnique({ where: { employeeId: idParam } });

      if (!existing) {
        return res.status(404).json({ success: false, message: "Employee not found" });
      }

      // Soft delete for safety (employees are referenced by sales/audit logs).
      await prisma.employee.update({
        where: { id: existing.id },
        data: { isActive: false },
      });

      return res.json({ success: true, message: "Employee disabled" });
    }

    return res.status(400).json({ success: false, message: "Invalid type" });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

module.exports = { listAllUsers, updateUser, deleteUser };
