const express = require("express");
const router = express.Router();

const prisma = require("../utils/prisma");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");

const {
  getDashboardStats,
  getSalesReport,
  getInventoryReport,
  getPerformanceReport,
} = require("../controllers/reports.controller");

// ------------------------------------
// Dashboard stats
// ------------------------------------
router.get(
  "/dashboard",
  authenticateToken,
  authorizeRoles("ADMIN", "EMPLOYEE"),
  getDashboardStats
);

// ------------------------------------
// Sales Report
// ------------------------------------
router.get(
  "/sales",
  authenticateToken,
  authorizeRoles("ADMIN", "EMPLOYEE"),
  getSalesReport
);

// ------------------------------------
// Inventory Report
// ------------------------------------
router.get(
  "/inventory",
  authenticateToken,
  authorizeRoles("ADMIN", "EMPLOYEE"),
  getInventoryReport
);

// ------------------------------------
// Performance Report
// ------------------------------------
router.get(
  "/performance",
  authenticateToken,
  authorizeRoles("ADMIN", "EMPLOYEE"),
  getPerformanceReport
);

// ------------------------------------
// Existing generic reports list (UNCHANGED)
// GET /api/reports
// ------------------------------------
router.get(
  "/",
  authenticateToken,
  authorizeRoles("ADMIN", "EMPLOYEE"),
  async (req, res) => {
    try {
      const type = req.query.type ? String(req.query.type) : null;
      const limitRaw = req.query.limit ? Number(req.query.limit) : 50;
      const take =
        Number.isFinite(limitRaw) && limitRaw > 0
          ? Math.min(limitRaw, 200)
          : 50;

      const where = {};
      if (type && type !== "all") where.ReportType = type;

      const list = await prisma.report.findMany({
        where,
        orderBy: { CreatedAt: "desc" },
        take,
      });

      return res.json({ success: true, data: list });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message || "Server error",
      });
    }
  }
);

module.exports = router;
