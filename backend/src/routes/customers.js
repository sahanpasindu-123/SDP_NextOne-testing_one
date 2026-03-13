const express = require("express");
const router = express.Router();
const prisma = require("../utils/prisma");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");
const bcrypt = require("bcryptjs");

// GET /api/customers - List all customers (Admin/Employee only)
router.get("/", authenticateToken, authorizeRoles("ADMIN", "EMPLOYEE"), async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      select: {
        CustomerID: true,
        Name: true,
        Email: true,
        Phone: true,
        // Prisma schema doesn't have Address or is_active; keep response shape stable.
        isActive: true,
        CreatedAt: true,
        UpdatedAt: true
      },
      orderBy: { CreatedAt: "desc" }
    });

    res.json({
      success: true,
      data: customers.map(customer => ({
        id: customer.CustomerID,
        name: customer.Name,
        email: customer.Email,
        phone: customer.Phone,
        address: null,
        status: customer.isActive ? "Active" : "Inactive",
        last: customer.UpdatedAt || customer.CreatedAt
      }))
    });
  } catch (error) {
    console.error("GET /api/customers error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch customers" });
  }
});

// GET /api/customers/:id - Get single customer (Admin/Employee only)
router.get("/:id", authenticateToken, authorizeRoles("ADMIN", "EMPLOYEE"), async (req, res) => {
  try {
    const customerId = parseInt(req.params.id);
    if (!customerId) {
      return res.status(400).json({ success: false, message: "Invalid customer ID" });
    }

    const customer = await prisma.customer.findUnique({
      where: { CustomerID: customerId },
      select: {
        CustomerID: true,
        Name: true,
        Email: true,
        Phone: true,
        isActive: true,
        CreatedAt: true,
        UpdatedAt: true
      }
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    res.json({
      success: true,
      data: {
        id: customer.CustomerID,
        name: customer.Name,
        email: customer.Email,
        phone: customer.Phone,
        address: null,
        status: customer.isActive ? "Active" : "Inactive",
        last: customer.UpdatedAt || customer.CreatedAt
      }
    });
  } catch (error) {
    console.error("GET /api/customers/:id error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch customer" });
  }
});

// POST /api/customers - Create new customer (Admin only)
router.post("/", authenticateToken, authorizeRoles("ADMIN"), async (req, res) => {
  try {
    const { name, email, phone, address, password } = req.body;

    const cleanName = typeof name === "string" ? name.trim() : "";
    const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const cleanPhone = typeof phone === "string" ? phone.trim() : "";
    const rawPassword = typeof password === "string" ? password : "";

    if (!cleanName || !cleanEmail || !cleanPhone) {
      return res.status(400).json({ success: false, message: "Name, email, and phone are required" });
    }

    if (cleanPhone.length > 15) {
      return res.status(400).json({ success: false, message: "Phone number is too long" });
    }

    // Prisma requires PasswordHash (non-null). We must accept a password and store only its hash.
    if (!rawPassword.trim()) {
      return res.status(400).json({ success: false, message: "Password is required" });
    }

    // Keep rules aligned with the customer signup flow (authController validates >= 8 + complexity).
    // Here we enforce a minimal safe baseline to prevent empty/weak passwords.
    if (rawPassword.trim().length < 8) {
      return res.status(400).json({ success: false, message: "Password must be at least 8 characters" });
    }

    const passwordHash = await bcrypt.hash(String(rawPassword), 10);

    const customer = await prisma.customer.create({
      data: {
        Name: cleanName,
        Email: cleanEmail,
        Phone: cleanPhone,
        PasswordHash: passwordHash,
        isActive: true,
        // Admin-created accounts must be usable with the existing login policy.
        emailVerified: true,
        emailVerifyCode: null,
        emailVerifyExpires: null,
      }
    });

    res.status(201).json({
      success: true,
      data: {
        id: customer.CustomerID,
        name: customer.Name,
        email: customer.Email,
        phone: customer.Phone,
        address: null,
        status: "Active",
        last: customer.CreatedAt
      }
    });
  } catch (error) {
    console.error("POST /api/customers error:", error);

    // Prisma: unique constraint failed
    if (error?.code === "P2002") {
      const targets = Array.isArray(error?.meta?.target) ? error.meta.target : [];
      return res.status(409).json({
        success: false,
        message: targets.includes("Phone") ? "Phone already exists" : "Email already exists",
      });
    }

    return res.status(500).json({ success: false, message: "Failed to create customer" });
  }
});

// PUT /api/customers/:id - Update customer (Admin only)
router.put("/:id", authenticateToken, authorizeRoles("ADMIN"), async (req, res) => {
  try {
    const customerId = parseInt(req.params.id);
    if (!customerId) {
      return res.status(400).json({ success: false, message: "Invalid customer ID" });
    }

    const { name, email, phone, address, status } = req.body;

    if (name !== undefined && !String(name || "").trim()) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }
    if (phone !== undefined && !String(phone || "").trim()) {
      return res.status(400).json({ success: false, message: "Phone is required" });
    }

    const customer = await prisma.customer.update({
      where: { CustomerID: customerId },
      data: {
        Name: name !== undefined ? String(name).trim() : undefined,
        Email: email !== undefined ? String(email).trim().toLowerCase() : undefined,
        Phone: phone !== undefined ? String(phone).trim() : undefined,
        isActive: status === "Active" ? true : false
      }
    });

    res.json({
      success: true,
      data: {
        id: customer.CustomerID,
        name: customer.Name,
        email: customer.Email,
        phone: customer.Phone,
        address: null,
        status: customer.isActive ? "Active" : "Inactive",
        last: customer.UpdatedAt
      }
    });
  } catch (error) {
    console.error("PUT /api/customers/:id error:", error);

    if (error?.code === "P2002") {
      const targets = Array.isArray(error?.meta?.target) ? error.meta.target : [];
      return res.status(409).json({
        success: false,
        message: targets.includes("Phone") ? "Phone already exists" : "Email already exists",
      });
    }

    res.status(500).json({ success: false, message: "Failed to update customer" });
  }
});

// DELETE /api/customers/:id - Delete customer (Admin only)
router.delete("/:id", authenticateToken, authorizeRoles("ADMIN"), async (req, res) => {
  try {
    const customerId = parseInt(req.params.id);
    if (!customerId) {
      return res.status(400).json({ success: false, message: "Invalid customer ID" });
    }

    await prisma.customer.delete({
      where: { CustomerID: customerId }
    });

    res.json({ success: true, message: "Customer deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/customers/:id error:", error);
    res.status(500).json({ success: false, message: "Failed to delete customer" });
  }
});

module.exports = router;
