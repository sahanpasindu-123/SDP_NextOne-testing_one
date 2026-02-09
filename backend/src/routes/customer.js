const express = require("express");
const prisma = require("../utils/prisma");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");

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
