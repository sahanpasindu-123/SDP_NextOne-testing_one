const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

/**
 * Create a new employee
 * POST /api/v1/admin/employees
 */
const createEmployee = async (req, res) => {
  try {
    const { employeeId, name, password, department } = req.body;

    // Validation
    if (!employeeId || !name || !password) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: employeeId, name, password",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    // Check duplicate employeeId
    const existingEmployee = await prisma.employee.findFirst({
      where: { employeeId },
    });

    if (existingEmployee) {
      return res.status(409).json({
        success: false,
        message: "Employee ID already exists",
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create employee
    const employee = await prisma.employee.create({
      data: {
        employeeId,
        name,
        password: passwordHash,
        role: "employee",
        department: department || null,
        isActive: true,
      },
    });

    // Remove password from response
    const { password: _, ...employeeWithoutPassword } = employee;

    return res.status(201).json({
      success: true,
      data: employeeWithoutPassword,
    });
  } catch (error) {
    console.error("Create employee error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Get all employees
 * GET /api/v1/admin/employees
 */
const getAllEmployees = async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      select: {
        id: true,
        employeeId: true,
        name: true,
        role: true,
        department: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.status(200).json({
      success: true,
      data: employees,
    });
  } catch (error) {
    console.error("Get all employees error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Update an employee
 * PUT /api/v1/admin/employees/:id
 */
const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, department } = req.body;

    // Validation
    if (!name && !department) {
      return res.status(400).json({
        success: false,
        message: "At least one field (name or department) must be provided",
      });
    }

    const existingEmployee = await prisma.employee.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingEmployee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const updatedEmployee = await prisma.employee.update({
      where: { id: parseInt(id) },
      data: {
        name: name ?? existingEmployee.name,
        department: department ?? existingEmployee.department,
      },
    });

    const { password: _, ...employeeWithoutPassword } = updatedEmployee;

    return res.status(200).json({
      success: true,
      data: employeeWithoutPassword,
    });
  } catch (error) {
    console.error("Update employee error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

/**
 * Disable an employee (soft delete)
 * DELETE /api/v1/admin/employees/:id
 */
const disableEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const existingEmployee = await prisma.employee.findUnique({
      where: { id: parseInt(id) },
    });

    if (!existingEmployee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    await prisma.employee.update({
      where: { id: parseInt(id) },
      data: { isActive: false },
    });

    return res.status(200).json({
      success: true,
      message: "Employee disabled successfully",
    });
  } catch (error) {
    console.error("Disable employee error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  createEmployee,
  getAllEmployees,
  updateEmployee,
  disableEmployee,
};
