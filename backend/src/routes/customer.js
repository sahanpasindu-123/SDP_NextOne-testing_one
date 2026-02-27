const express = require("express");
const prisma = require("../utils/prisma");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");
const bcrypt = require("bcryptjs");
const { writeAuditLog } = require("../utils/auditLog");

/**
 * Customer Portal API (strict prefix)
 *
 * Requirement:
 * - /api/customer/* must be CUSTOMER-only.
 *
 * Notes:
 * - This router is intentionally small and non-destructive.
 * - It provides customer-scoped endpoints without changing existing endpoints
 *   like /api/reservations/my (backwards compatible).
 */
const router = express.Router();

// RBAC: everything under this router is CUSTOMER only
router.use(authenticateToken, authorizeRoles("CUSTOMER"));

function isValidEmail(email) {
  if (!email) return false;
  const cleaned = String(email).trim().toLowerCase();
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(cleaned);
}

function isValidSLPhone(phone) {
  if (!phone) return false;
  const cleaned = String(phone).replace(/\s+/g, "");
  const regex = /^(?:\+94|94|0)7\d{8}$/;
  return regex.test(cleaned);
}

function normalizeSLPhone(phone) {
  let p = String(phone).replace(/\s+/g, "");
  if (p.startsWith("+94")) return p;
  if (p.startsWith("94")) return `+${p}`;
  if (p.startsWith("0")) return `+94${p.slice(1)}`;
  return p;
}

function validateStrongPassword(password) {
  if (typeof password !== "string") return { ok: false, message: "Password must be a string" };
  const p = password.trim();
  if (p.length < 8) return { ok: false, message: "Password must be at least 8 characters" };
  if (!/[a-z]/.test(p)) return { ok: false, message: "Password must include at least 1 lowercase letter" };
  if (!/[A-Z]/.test(p)) return { ok: false, message: "Password must include at least 1 uppercase letter" };
  if (!/[0-9]/.test(p)) return { ok: false, message: "Password must include at least 1 number" };
  if (!/[!@#$%^&*(),.?\":{}|<>_\-\\[\]\/~`+=;'@]/.test(p)) {
    return { ok: false, message: "Password must include at least 1 special character" };
  }
  if (/\s/.test(p)) return { ok: false, message: "Password must not contain spaces" };
  return { ok: true };
}

// GET /api/customer/me
router.get("/me", async (req, res) => {
  try {
    const customerId = Number(req.user?.id);
    if (!Number.isFinite(customerId)) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const customer = await prisma.customer.findUnique({
      where: { CustomerID: customerId },
      select: {
        CustomerID: true,
        Name: true,
        Email: true,
        Phone: true,
        CreatedAt: true,
        UpdatedAt: true,
        emailVerified: true,
        isActive: true,
        lastLogin: true,
      },
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: "Customer not found" });
    }

    return res.json({ success: true, data: customer });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
});

// PATCH /api/customer/me
// Update self profile (Name, Email, Phone)
router.patch("/me", async (req, res) => {
  try {
    const customerId = Number(req.user?.id);
    if (!Number.isFinite(customerId)) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const nameRaw = req.body?.name;
    const emailRaw = req.body?.email;
    const phoneRaw = req.body?.phone;

    const data = {};

    if (typeof nameRaw === "string") {
      const clean = nameRaw.trim();
      if (!clean) return res.status(400).json({ success: false, message: "Name is required" });
      data.Name = clean;
    }

    if (typeof emailRaw === "string") {
      const clean = emailRaw.trim().toLowerCase();
      if (!clean) return res.status(400).json({ success: false, message: "Email is required" });
      if (!isValidEmail(clean)) return res.status(400).json({ success: false, message: "Invalid email" });
      data.Email = clean;
    }

    if (typeof phoneRaw === "string") {
      const clean = phoneRaw.trim();
      if (!clean) return res.status(400).json({ success: false, message: "Phone is required" });
      if (!isValidSLPhone(clean)) {
        return res.status(400).json({ success: false, message: "Invalid phone number" });
      }
      data.Phone = normalizeSLPhone(clean);
    }

    if (!Object.keys(data).length) {
      return res.status(400).json({ success: false, message: "No changes provided" });
    }

    const before = await prisma.customer.findUnique({
      where: { CustomerID: customerId },
      select: { CustomerID: true, Name: true, Email: true, Phone: true },
    });

    if (!before) return res.status(404).json({ success: false, message: "Customer not found" });

    const updated = await prisma.customer.update({
      where: { CustomerID: customerId },
      data,
      select: {
        CustomerID: true,
        Name: true,
        Email: true,
        Phone: true,
        CreatedAt: true,
        UpdatedAt: true,
        emailVerified: true,
        isActive: true,
        lastLogin: true,
      },
    });

    await writeAuditLog(req, {
      action: "CUSTOMER_PROFILE_UPDATE",
      entityType: "customer",
      entityId: updated.CustomerID,
      before,
      after: { CustomerID: updated.CustomerID, Name: updated.Name, Email: updated.Email, Phone: updated.Phone },
      meta: { inputKeys: Object.keys(req.body || {}) },
    });

    return res.json({ success: true, message: "Profile updated successfully", data: updated });
  } catch (err) {
    // Prisma: unique constraint
    if (err?.code === "P2002") {
      const fields = Array.isArray(err?.meta?.target) ? err.meta.target.join(", ") : "field";
      return res.status(409).json({ success: false, message: `Duplicate ${fields}` });
    }
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
});

// POST /api/customer/change-password
router.post("/change-password", async (req, res) => {
  try {
    const customerId = Number(req.user?.id);
    if (!Number.isFinite(customerId)) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "currentPassword and newPassword are required" });
    }

    const pw = validateStrongPassword(String(newPassword));
    if (!pw.ok) return res.status(400).json({ success: false, message: pw.message });

    const customer = await prisma.customer.findUnique({
      where: { CustomerID: customerId },
      select: { CustomerID: true, PasswordHash: true, isActive: true },
    });

    if (!customer) return res.status(404).json({ success: false, message: "Customer not found" });
    if (customer.isActive === false) {
      return res.status(403).json({ success: false, message: "Customer account is inactive" });
    }

    const ok = await bcrypt.compare(String(currentPassword), customer.PasswordHash);
    if (!ok) return res.status(401).json({ success: false, message: "Current password is incorrect" });

    const hashed = await bcrypt.hash(String(newPassword), 10);
    await prisma.customer.update({
      where: { CustomerID: customerId },
      data: { PasswordHash: hashed },
    });

    await writeAuditLog(req, {
      action: "CUSTOMER_PASSWORD_CHANGE",
      entityType: "customer",
      entityId: customerId,
      before: null,
      after: null,
      meta: { note: "password changed (hash not logged)" },
    });

    return res.json({ success: true, message: "Password updated successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
});

// GET /api/customer/reservations
// Alias to keep customer portal calls under /api/customer/*.
router.get("/reservations", async (req, res) => {
  try {
    const customerId = Number(req.user?.id);
    if (!Number.isFinite(customerId)) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const items = await prisma.reservation.findMany({
      where: { CustomerID: customerId },
      orderBy: { ReservedAt: "desc" },
      include: { product: true },
      take: 200,
    });

    return res.json({ success: true, data: items });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
});

module.exports = router;
