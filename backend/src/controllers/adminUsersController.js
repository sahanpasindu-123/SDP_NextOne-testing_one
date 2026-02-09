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

module.exports = { listAllUsers };
