const express = require("express");
const router = express.Router();

const prisma = require("../utils/prisma");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");

// ADMIN: Assign employee to a place
// POST /api/employee-places/assign
// body: { employeeId: (Employee.id), placeId: (PlaceID), isPrimary?: boolean }
router.post(
  "/assign",
  authenticateToken,
  authorizeRoles("ADMIN"),
  async (req, res) => {
    try {
      const { employeeId, placeId, isPrimary } = req.body;

      const eid = Number(employeeId);
      const pid = Number(placeId);

      if (!eid || !pid) {
        return res.status(400).json({ success: false, message: "employeeId and placeId required" });
      }

      // if primary, unset other primaries for employee
      if (isPrimary === true) {
        await prisma.employeePlace.updateMany({
          where: { EmployeeID: eid },
          data: { IsPrimary: false },
        });
      }

      const link = await prisma.employeePlace.upsert({
        where: { EmployeeID_PlaceID: { EmployeeID: eid, PlaceID: pid } },
        update: { IsPrimary: isPrimary === true },
        create: { EmployeeID: eid, PlaceID: pid, IsPrimary: isPrimary === true },
      });

      return res.status(201).json({ success: true, data: link });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message || "Server error" });
    }
  }
);

// ADMIN: List employee places
// GET /api/employee-places/:employeeId
router.get(
  "/:employeeId",
  authenticateToken,
  authorizeRoles("ADMIN"),
  async (req, res) => {
    try {
      const eid = Number(req.params.employeeId);

      const list = await prisma.employeePlace.findMany({
        where: { EmployeeID: eid },
        include: { place: true },
        orderBy: { CreatedAt: "desc" },
      });

      return res.json({ success: true, data: list });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message || "Server error" });
    }
  }
);

module.exports = router;
