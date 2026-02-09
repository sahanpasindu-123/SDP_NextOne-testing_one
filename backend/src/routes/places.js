const express = require("express");
const router = express.Router();

const prisma = require("../utils/prisma");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");

// ADMIN: Create place
router.post(
  "/",
  authenticateToken,
  authorizeRoles("ADMIN"),
  async (req, res) => {
    try {
      const { code, name, address, city, phone, isActive } = req.body;

      if (!code || !name) {
        return res.status(400).json({ success: false, message: "code and name are required" });
      }

      const created = await prisma.place.create({
        data: {
          Code: String(code).trim(),
          Name: String(name).trim(),
          Address: address ? String(address) : null,
          City: city ? String(city) : null,
          Phone: phone ? String(phone) : null,
          IsActive: typeof isActive === "boolean" ? isActive : true,
        },
      });

      return res.status(201).json({ success: true, data: created });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message || "Server error" });
    }
  }
);

// ADMIN: List places
router.get(
  "/",
  authenticateToken,
  authorizeRoles("ADMIN"),
  async (req, res) => {
    try {
      const list = await prisma.place.findMany({
        orderBy: { CreatedAt: "desc" },
      });
      return res.json({ success: true, data: list });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message || "Server error" });
    }
  }
);

// ADMIN: Update place
router.patch(
  "/:id",
  authenticateToken,
  authorizeRoles("ADMIN"),
  async (req, res) => {
    try {
      const placeId = Number(req.params.id);
      const { name, address, city, phone, isActive } = req.body;

      if (!Number.isFinite(placeId)) {
        return res.status(400).json({ success: false, message: "Invalid place id" });
      }

      const updated = await prisma.place.update({
        where: { PlaceID: placeId },
        data: {
          Name: name ? String(name) : undefined,
          Address: address ? String(address) : undefined,
          City: city ? String(city) : undefined,
          Phone: phone ? String(phone) : undefined,
          IsActive: typeof isActive === "boolean" ? isActive : undefined,
        },
      });

      return res.json({ success: true, data: updated });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message || "Server error" });
    }
  }
);

// ADMIN: Soft delete (deactivate)
router.patch(
  "/:id/deactivate",
  authenticateToken,
  authorizeRoles("ADMIN"),
  async (req, res) => {
    try {
      const placeId = Number(req.params.id);

      if (!Number.isFinite(placeId)) {
        return res.status(400).json({ success: false, message: "Invalid place id" });
      }

      const updated = await prisma.place.update({
        where: { PlaceID: placeId },
        data: { IsActive: false },
      });
      return res.json({ success: true, data: updated });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message || "Server error" });
    }
  }
);

module.exports = router;
