const express = require("express");
const router = express.Router();

const prisma = require("../utils/prisma");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");

// ----------------------------------------------------
// GET /api/alerts
// query: type, status, q, range=all|today|7d|30d
// ----------------------------------------------------
router.get(
  "/",
  authenticateToken,
  authorizeRoles("ADMIN", "EMPLOYEE"),
  async (req, res) => {
    try {
      const type = req.query.type ? String(req.query.type) : null;
      const status = req.query.status ? String(req.query.status) : null;
      const q = req.query.q ? String(req.query.q).trim() : null;
      const range = req.query.range ? String(req.query.range) : "all";

      const and = [];

      if (type && type !== "all") {
        // tolerate frontend-friendly labels
        const normalizedType = String(type).trim().toUpperCase().replace(/\s+/g, "_");
        and.push({ Type: normalizedType });
      }

      if (status && status !== "all") {
        const normalizedStatus = String(status).trim().toUpperCase();
        if (normalizedStatus === "UNREAD") {
          // "Unread" should include historical NULL / NEW values too
          and.push({ OR: [{ Status: null }, { Status: "Unread" }, { Status: "NEW" }] });
        } else {
          and.push({ Status: status });
        }
      }

      if (q) {
        and.push({ OR: [{ Message: { contains: q } }] });
      }

      if (range && range !== "all") {
        const now = new Date();
        let from = null;

        if (range === "today") {
          from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        } else if (range === "7d") {
          from = new Date(now);
          from.setDate(now.getDate() - 7);
        } else if (range === "30d") {
          from = new Date(now);
          from.setDate(now.getDate() - 30);
        }

        if (from) and.push({ CreatedAt: { gte: from } });
      }

      const where = and.length ? { IsActive: true, AND: and } : { IsActive: true };

      const list = await prisma.alert.findMany({
        where,
        orderBy: { CreatedAt: "desc" },
      });

      // Normalize status (historical values: NEW/Unread/null)
      const normalized = list.map((a) => ({
        ...a,
        Status: a.Status || "Unread",
      }));

      return res.json({ success: true, data: normalized });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message || "Server error" });
    }
  }
);

// ----------------------------------------------------
// PATCH /api/alerts/:id/read
// ----------------------------------------------------
router.patch(
  "/:id/read",
  authenticateToken,
  authorizeRoles("ADMIN", "EMPLOYEE"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ success: false, message: "Invalid id" });
      }

      const updated = await prisma.alert.update({
        where: { AlertID: id },
        data: { Status: "Read" },
      });

      return res.json({ success: true, message: "Marked as read", data: updated });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message || "Server error" });
    }
  }
);

// ----------------------------------------------------
// PATCH /api/alerts/read-all
// ----------------------------------------------------
router.patch(
  "/read-all",
  authenticateToken,
  authorizeRoles("ADMIN", "EMPLOYEE"),
  async (req, res) => {
    try {
      const result = await prisma.alert.updateMany({
        where: { IsActive: true, OR: [{ Status: null }, { Status: "Unread" }] },
        data: { Status: "Read" },
      });

      return res.json({ success: true, message: "All marked as read", data: result });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message || "Server error" });
    }
  }
);

module.exports = router;
