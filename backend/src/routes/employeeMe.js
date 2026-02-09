const express = require("express");
const router = express.Router();

const prisma = require("../utils/prisma");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");

// EMPLOYEE: My assigned places
// GET /api/employee/me/places
router.get(
  "/me/places",
  authenticateToken,
  authorizeRoles("EMPLOYEE"),
  async (req, res) => {
    try {
      // IMPORTANT: EmployeeID references employees.id (numeric PK)
      const employeeId = Number(req.user.dbId);

      const list = await prisma.employeePlace.findMany({
        where: { EmployeeID: employeeId },
        include: { place: true },
        orderBy: { IsPrimary: "desc" },
      });

      return res.json({ success: true, data: list });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message || "Server error" });
    }
  }
);

// EMPLOYEE: View products for a place (only if assigned)
// GET /api/employee/place/:placeId/products
router.get(
  "/place/:placeId/products",
  authenticateToken,
  authorizeRoles("EMPLOYEE"),
  async (req, res) => {
    try {
      // IMPORTANT: EmployeeID references employees.id (numeric PK)
      const employeeId = Number(req.user.dbId);
      const placeId = Number(req.params.placeId);

      const assigned = await prisma.employeePlace.findFirst({
        where: { EmployeeID: employeeId, PlaceID: placeId },
      });

      if (!assigned) {
        return res.status(403).json({ success: false, message: "Not assigned to this place" });
      }

      const products = await prisma.product.findMany({
        where: { PlaceID: placeId },
        orderBy: { UpdatedAt: "desc" },
      });

      return res.json({ success: true, data: products });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message || "Server error" });
    }
  }
);

module.exports = router;
