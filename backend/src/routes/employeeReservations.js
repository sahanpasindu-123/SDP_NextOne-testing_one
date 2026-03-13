const express = require("express");
const router = express.Router();

const prisma = require("../utils/prisma");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");
const { expireReservationIfNeededTx } = require("../services/reservationService");

const normStatus = (s) => String(s || "").trim().toUpperCase();

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
      const where = {
        product: { PlaceID: { in: placeIds } },
      };
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
      return res.json({ success: true, data: reservations });
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

      const txRes = await prisma.$transaction(async (tx) => {
        const r = await tx.reservation.findUnique({
          where: { ReservationID: reservationId },
          include: { product: { select: { PlaceID: true } } },
        });

        if (!r) {
          const e = new Error("Reservation not found");
          e.status = 404;
          throw e;
        }

        const current = normStatus(r.Status);
        if (!["PENDING", "RESERVED"].includes(current)) {
          const e = new Error(`Cannot approve a ${current.toLowerCase()} reservation`);
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

        // Enforce expiry (3-day rule) AFTER authorization checks
        const exp = await expireReservationIfNeededTx(tx, reservationId);
        if (exp?.expired) {
          return { expired: true };
        }

        const lock = await tx.reservation.updateMany({
          where: { ReservationID: reservationId, Status: { in: ["PENDING", "RESERVED"] } },
          data: { Status: "CONFIRMED" },
        });

        if (lock.count !== 1) {
          const e = new Error("Reservation already processed or not pending");
          e.status = 400;
          throw e;
        }

        const updated = await tx.reservation.findUnique({ where: { ReservationID: reservationId } });
        return { expired: false, data: updated };
      });

      if (txRes?.expired) {
        return res.status(400).json({ success: false, message: "Reservation has expired" });
      }

      return res.json({ success: true, message: "Reservation confirmed", data: txRes?.data });
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

      const txRes = await prisma.$transaction(async (tx) => {
        const r = await tx.reservation.findUnique({
          where: { ReservationID: reservationId },
          include: { product: { select: { PlaceID: true } } },
        });

        if (!r) {
          const e = new Error("Reservation not found");
          e.status = 404;
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

        // Enforce expiry (3-day rule) before allowing reject (prevents double stock return).
        const exp = await expireReservationIfNeededTx(tx, reservationId);
        if (exp?.expired) {
          return { expired: true };
        }

        const current = normStatus(r.Status);
        if (!["PENDING", "RESERVED", "CONFIRMED"].includes(current)) {
          const e = new Error(`Cannot reject a ${current.toLowerCase()} reservation`);
          e.status = 400;
          throw e;
        }

        const lock = await tx.reservation.updateMany({
          where: { ReservationID: reservationId, Status: { in: ["PENDING", "RESERVED", "CONFIRMED"] } },
          data: { Status: "REJECTED" },
        });

        if (lock.count !== 1) {
          const e = new Error(`Cannot reject a ${current.toLowerCase()} reservation`);
          e.status = 400;
          throw e;
        }

        // Return stock (reservation create flow already decremented stock)
        await tx.product.update({
          where: { ProductID: r.ProductID },
          data: { Stock: { increment: r.Quantity } },
        });

        const resv = await tx.reservation.findUnique({ where: { ReservationID: reservationId } });

        return { expired: false, data: resv };
      });

      if (txRes?.expired) {
        return res.status(400).json({ success: false, message: "Reservation has expired" });
      }

      return res.json({ success: true, message: "Reservation rejected", data: txRes?.data });
    } catch (err) {
      return res.status(err.status || 500).json({ success: false, message: err.message || "Server error" });
    }
  }
);


module.exports = router;
