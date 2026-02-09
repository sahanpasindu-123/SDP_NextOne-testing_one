const express = require("express");
const router = express.Router();

const prisma = require("../utils/prisma");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");

// ------------------------------------
// GET /api/employee/reservations
// Query params (optional):
//   ?status=PENDING | CONFIRMED | CANCELLED | REJECTED
// ------------------------------------
router.get(
  "/reservations",
  authenticateToken,
  authorizeRoles("EMPLOYEE"),
  async (req, res) => {
    try {
      // Use numeric PK for joins (employee_places.EmployeeID references employees.id)
      const employeeId = Number(req.user.dbId);
      const status = req.query.status
        ? String(req.query.status).toUpperCase()
        : null;

      // 1️⃣ Get employee assigned places
      const assignedPlaces = await prisma.employeePlace.findMany({
        where: { EmployeeID: employeeId },
        select: { PlaceID: true },
      });

      const placeIds = assignedPlaces.map(p => p.PlaceID);

      if (placeIds.length === 0) {
        return res.json({ success: true, data: [] });
      }

      // 2️⃣ Reservation base filter
      const where = {};
      if (status) where.Status = status;

      // 3️⃣ Fetch reservations + product + place
      const reservations = await prisma.reservation.findMany({
        where,
        orderBy: { ReservedAt: "desc" },
        include: {
          customer: {
            select: {
              CustomerID: true,
              Name: true,
              Email: true,
              Phone: true,
            },
          },
          product: {
            include: {
              place: true,
            },
          },
        },
      });

      // 4️⃣ Filter by employee's places (product.PlaceID)
      const filtered = reservations.filter(r =>
        r.product?.PlaceID && placeIds.includes(r.product.PlaceID)
      );

      return res.json({ success: true, data: filtered });
    } catch (err) {
      console.error("employee reservations error:", err);
      return res
        .status(500)
        .json({ success: false, message: err.message || "Server error" });
    }
  }
);

// ------------------------------------
// PATCH /api/employee/reservations/:id/approve
// EMPLOYEE can confirm reservation (no ApprovedBy because ApprovedBy links Admin)
// ------------------------------------
router.patch(
  "/reservations/:id/approve",
  authenticateToken,
  authorizeRoles("EMPLOYEE"),
  async (req, res) => {
    try {
      const reservationId = Number(req.params.id);
      if (!Number.isFinite(reservationId)) {
        return res.status(400).json({ success: false, message: "Invalid reservation id" });
      }

      const employeeId = Number(req.user.dbId);
      if (!Number.isFinite(employeeId)) {
        return res.status(401).json({ success: false, message: "Authentication required" });
      }

      const r = await prisma.reservation.findUnique({
        where: { ReservationID: reservationId },
        include: { product: { select: { PlaceID: true } } },
      });

      if (!r) return res.status(404).json({ success: false, message: "Reservation not found" });
      if (r.Status === "CANCELLED") return res.status(400).json({ success: false, message: "Cancelled reservation" });

      const placeId = r.product?.PlaceID;
      if (!Number.isFinite(Number(placeId))) {
        return res.status(400).json({ success: false, message: "Reservation has no valid place" });
      }

      const assigned = await prisma.employeePlace.findFirst({
        where: { EmployeeID: employeeId, PlaceID: Number(placeId) },
        select: { id: true },
      });
      if (!assigned) {
        return res.status(403).json({ success: false, message: "Not authorized for this reservation" });
      }

      const updated = await prisma.reservation.update({
        where: { ReservationID: reservationId },
        data: { Status: "CONFIRMED" },
      });

      return res.json({ success: true, message: "Reservation confirmed", data: updated });
    } catch (err) {
      return res.status(err.status || 500).json({ success: false, message: err.message || "Server error" });
    }
  }
);

// ------------------------------------
// PATCH /api/employee/reservations/:id/reject
// Reject => return stock + set REJECTED
// ------------------------------------
router.patch(
  "/reservations/:id/reject",
  authenticateToken,
  authorizeRoles("EMPLOYEE"),
  async (req, res) => {
    try {
      const reservationId = Number(req.params.id);
      if (!Number.isFinite(reservationId)) {
        return res.status(400).json({ success: false, message: "Invalid reservation id" });
      }

      const employeeId = Number(req.user.dbId);
      if (!Number.isFinite(employeeId)) {
        return res.status(401).json({ success: false, message: "Authentication required" });
      }

      const updated = await prisma.$transaction(async (tx) => {
        const r = await tx.reservation.findUnique({
          where: { ReservationID: reservationId },
          include: { product: { select: { PlaceID: true } } },
        });

        if (!r) {
          const e = new Error("Reservation not found");
          e.status = 404;
          throw e;
        }

        if (r.Status === "CANCELLED") {
          const e = new Error("Already cancelled");
          e.status = 400;
          throw e;
        }

        const placeId = r.product?.PlaceID;
        if (!Number.isFinite(Number(placeId))) {
          const e = new Error("Reservation has no valid place");
          e.status = 400;
          throw e;
        }

        const assigned = await tx.employeePlace.findFirst({
          where: { EmployeeID: employeeId, PlaceID: Number(placeId) },
          select: { id: true },
        });
        if (!assigned) {
          const e = new Error("Not authorized for this reservation");
          e.status = 403;
          throw e;
        }

        // Return stock ONLY if it was not already returned
        // (reservation create flow already decremented stock)
        await tx.product.update({
          where: { ProductID: r.ProductID },
          data: { Stock: { increment: r.Quantity } },
        });

        const resv = await tx.reservation.update({
          where: { ReservationID: reservationId },
          data: { Status: "REJECTED" },
        });

        return resv;
      });

      return res.json({ success: true, message: "Reservation rejected", data: updated });
    } catch (err) {
      return res.status(err.status || 500).json({ success: false, message: err.message || "Server error" });
    }
  }
);


module.exports = router;
