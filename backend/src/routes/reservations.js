// backend/src/routes/reservations.js

const express = require("express");
const router = express.Router();

const prisma = require("../utils/prisma");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");
const { writeAuditLog } = require("../utils/auditLog");

const {
  confirmReservation,
  cancelReservation,
} = require("../controllers/reservationController");

const {
  createReservation: createReservationTx,
  ReservationError,
  expireReservationsForCustomer,
  expireReservationIfNeededTx,
} = require("../services/reservationService");

/**
 * Helpers
 */
const normStatus = (s) => String(s || "").trim().toUpperCase();

const STATUS = {
  PENDING: "PENDING",
  RESERVED: "RESERVED",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
  REJECTED: "REJECTED",
  COMPLETED: "COMPLETED",
};

const isPendingLike = (s) =>
  [STATUS.PENDING, STATUS.RESERVED].includes(normStatus(s));

const isFinal = (s) =>
  [STATUS.CANCELLED, STATUS.REJECTED, STATUS.COMPLETED].includes(normStatus(s));

const parseId = (raw) => {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const expireIfNeededTx = async (tx, reservationId) => {
  const exp = await expireReservationIfNeededTx(tx, reservationId);
  return !!exp?.expired;
};

// Transaction-safe audit log helper (so audit + stock changes are atomic)
const txAuditLog = async (tx, req, { action, entityType, entityId, before, after, meta }) => {
  const role = String(req.user?.role || "").toUpperCase();
  const dbId = req.user?.dbId;

  const data = {
    actorRole: role || "UNKNOWN",
    action,
    entityType,
    entityId: String(entityId),
    beforeData: before == null ? null : JSON.stringify(before),
    afterData: after == null ? null : JSON.stringify(after),
    meta: JSON.stringify({
      ...(meta || {}),
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      path: req.originalUrl,
      method: req.method,
    }),
    adminId: null,
    employeeId: null,
    customerId: null,
  };

  if (role === "ADMIN") data.adminId = Number(dbId);
  if (role === "EMPLOYEE") data.employeeId = Number(dbId);
  if (role === "CUSTOMER") data.customerId = Number(dbId);

  // fail-safe: do not break business action if audit insert fails
  try {
    await tx.auditLog.create({ data });
  } catch (e) {
    console.warn("TX AUDIT LOG FAILED:", e?.message || e);
  }
};

/**
 * ---------------------------
 * CUSTOMER: My Reservations
 * GET /api/reservations/my
 * ---------------------------
 */
router.get(
  "/my",
  authenticateToken,
  authorizeRoles("CUSTOMER"),
  async (req, res) => {
    try {
      const customerId = Number(req.user.dbId);

      // Enforce expiry (3-day rule) so customers see up-to-date status and stock is restored.
      await expireReservationsForCustomer(customerId).catch(() => {});

      const items = await prisma.reservation.findMany({
        where: { CustomerID: customerId },
        orderBy: { ReservedAt: "desc" },
        include: { product: true },
      });

      return res.json({ success: true, data: items });
    } catch (err) {
      return res
        .status(500)
        .json({ success: false, message: err.message || "Server error" });
    }
  }
);

/**
 * ---------------------------
 * CUSTOMER: Create Reservation
 * POST /api/reservations
 * body: { productId, quantity, notes, reservedAt }
 * ---------------------------
 */
router.post(
  "/",
  authenticateToken,
  authorizeRoles("CUSTOMER"),
  async (req, res) => {
    try {
      const { productId, quantity, notes, reservedAt } = req.body;
      const customerId = Number(req.user.dbId);

      const { reservationId, availableStock } = await createReservationTx({
        productId,
        quantity,
        customerId,
        notes,
        reservedAt,
      });

      const created = await prisma.reservation.findUnique({
        where: { ReservationID: reservationId },
        include: { product: true },
      });

      // Non-transaction audit (service already does stock update; if you added tx audit there, this is still ok)
      await writeAuditLog(req, {
        action: "RESERVATION_CREATE",
        entityType: "reservation",
        entityId: reservationId,
        before: null,
        after: { ReservationID: reservationId, Status: created?.Status },
        meta: { productId, quantity, availableStock },
      });

      return res.status(201).json({
        success: true,
        message: "Reservation created",
        availableStock,
        data: created,
      });
    } catch (err) {
      const status =
        err instanceof ReservationError ? err.status : err.status || 500;

      return res
        .status(status)
        .json({ success: false, message: err.message || "Server error" });
    }
  }
);

/**
 * ---------------------------
 * ADMIN: List all reservations (canonical)
 * GET /api/reservations
 *
 * Optional query params:
 *  - page (default 1)
 *  - limit (default 50, max 500)
 *  - status (e.g., PENDING, CONFIRMED, CANCELLED, REJECTED, COMPLETED, RESERVED)
 * ---------------------------
 */
router.get(
  "/",
  authenticateToken,
  authorizeRoles("ADMIN"),
  async (req, res) => {
    try {
      const page = Math.max(Number(req.query.page) || 1, 1);
      const limitRaw = Number(req.query.limit) || 50;
      const limit = Math.min(Math.max(limitRaw, 1), 500);

      const status = req.query.status ? normStatus(req.query.status) : null;
      const where = status ? { Status: status } : {};

      const [list, total] = await Promise.all([
        prisma.reservation.findMany({
          where,
          orderBy: { ReservedAt: "desc" },
          include: { customer: true, product: true, admin: true },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.reservation.count({ where }),
      ]);

      return res.json({
        success: true,
        data: list,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      return res
        .status(500)
        .json({ success: false, message: err.message || "Server error" });
    }
  }
);

/**
 * ---------------------------
 * CONFIRM Reservation
 * PUT /api/reservations/:id/confirm
 * Roles: CUSTOMER, ADMIN
 * ---------------------------
 */
router.put(
  "/:id/confirm",
  authenticateToken,
  authorizeRoles("CUSTOMER", "ADMIN"),
  confirmReservation
);

/**
 * ---------------------------
 * CUSTOMER: Cancel Reservation
 * PATCH /api/reservations/:id/cancel
 * Alias: PUT /api/reservations/:id/cancel
 * ---------------------------
 */
router.patch(
  "/:id/cancel",
  authenticateToken,
  authorizeRoles("CUSTOMER"),
  cancelReservation
);

router.put(
  "/:id/cancel",
  authenticateToken,
  authorizeRoles("CUSTOMER"),
  cancelReservation
);

/**
 * ---------------------------
 * ADMIN: List all reservations (duplicate endpoint)
 * GET /api/reservations/admin/all
 * NOTE: Duplicates GET /api/reservations (ADMIN).
 * Recommended: Remove this endpoint OR keep temporarily for backward-compat.
 * ---------------------------
 */
router.get(
  "/admin/all",
  authenticateToken,
  authorizeRoles("ADMIN"),
  async (req, res) => {
    try {
      const list = await prisma.reservation.findMany({
        orderBy: { ReservedAt: "desc" },
        include: { customer: true, product: true, admin: true },
      });

      return res.json({ success: true, data: list });
    } catch (err) {
      return res
        .status(500)
        .json({ success: false, message: err.message || "Server error" });
    }
  }
);

/**
 * ---------------------------
 * ADMIN: Approve reservation
 * PATCH /api/reservations/admin/:id/approve
 *
 * Rules:
 *  - Only PENDING/RESERVED -> CONFIRMED
 *  - Block CANCELLED/REJECTED/CONFIRMED/COMPLETED
 * ---------------------------
 */
router.patch(
  "/admin/:id/approve",
  authenticateToken,
  authorizeRoles("ADMIN"),
  async (req, res) => {
    try {
      const reservationId = parseId(req.params.id);
      if (!reservationId) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid reservation id" });
      }

      const adminId = Number(req.user.dbId);

      const txRes = await prisma.$transaction(async (tx) => {
        const expired = await expireIfNeededTx(tx, reservationId);
        if (expired) return { expired: true };

        const r = await tx.reservation.findUnique({
          where: { ReservationID: reservationId },
        });

        if (!r) {
          const e = new Error("Reservation not found");
          e.status = 404;
          throw e;
        }

        const current = normStatus(r.Status);

        if (!isPendingLike(current)) {
          const e = new Error(`Cannot approve a ${current.toLowerCase()} reservation`);
          e.status = 400;
          throw e;
        }

        const u = await tx.reservation.update({
          where: { ReservationID: reservationId },
          data: {
            Status: STATUS.CONFIRMED,
            ApprovedBy: adminId,
          },
        });

        return { expired: false, before: { current, ApprovedBy: r.ApprovedBy }, updated: u };
      });

      if (txRes?.expired) {
        return res.status(400).json({ success: false, message: "Reservation has expired" });
      }

      const { before, updated } = txRes;

      await writeAuditLog(req, {
        action: "RESERVATION_APPROVE",
        entityType: "reservation",
        entityId: reservationId,
        before: { Status: before.current, ApprovedBy: before.ApprovedBy },
        after: { Status: updated.Status, ApprovedBy: updated.ApprovedBy },
      });

      console.log(
        `AUDIT: admin ${adminId} approved reservation ${reservationId} (${before.current} -> ${STATUS.CONFIRMED})`
      );

      return res.json({
        success: true,
        message: "Reservation approved",
        data: updated,
      });
    } catch (err) {
      return res
        .status(err.status || 500)
        .json({ success: false, message: err.message || "Server error" });
    }
  }
);

/**
 * ---------------------------
 * ADMIN: Reject reservation
 * PATCH /api/reservations/admin/:id/reject
 *
 * Rules:
 *  - Only PENDING/RESERVED -> REJECTED
 *  - Return stock once (no double increment)
 *  - Block CANCELLED/REJECTED/CONFIRMED/COMPLETED
 * ---------------------------
 */
router.patch(
  "/admin/:id/reject",
  authenticateToken,
  authorizeRoles("ADMIN"),
  async (req, res) => {
    try {
      const reservationId = parseId(req.params.id);
      if (!reservationId) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid reservation id" });
      }

      const adminId = Number(req.user.dbId);

      const txRes = await prisma.$transaction(async (tx) => {
        const expired = await expireIfNeededTx(tx, reservationId);
        if (expired) return { expired: true };

        const r = await tx.reservation.findUnique({
          where: { ReservationID: reservationId },
        });

        if (!r) {
          const e = new Error("Reservation not found");
          e.status = 404;
          throw e;
        }

        const current = normStatus(r.Status);

        // ✅ allow-list prevents double stock return + blocks final/non-pending states
        if (!isPendingLike(current)) {
          const e = new Error(
            `Cannot reject a ${current.toLowerCase()} reservation`
          );
          e.status = 400;
          throw e;
        }

        // stock BEFORE snapshot
        const prodBefore = await tx.product.findUnique({
          where: { ProductID: r.ProductID },
          select: { Stock: true },
        });
        const beforeStock = Number(prodBefore?.Stock || 0);

        // Return stock on rejection (only valid while still pending/reserved)
        await tx.product.update({
          where: { ProductID: r.ProductID },
          data: { Stock: { increment: r.Quantity } },
        });

        const prodAfter = await tx.product.findUnique({
          where: { ProductID: r.ProductID },
          select: { Stock: true },
        });
        const afterStock = Number(prodAfter?.Stock || 0);

        const reservationUpdated = await tx.reservation.update({
          where: { ReservationID: reservationId },
          data: {
            Status: STATUS.REJECTED,
            ApprovedBy: adminId,
          },
        });

        // TX audit: reservation status change
        await txAuditLog(tx, req, {
          action: "RESERVATION_REJECT",
          entityType: "reservation",
          entityId: reservationId,
          before: { Status: current, ApprovedBy: r.ApprovedBy },
          after: { Status: reservationUpdated.Status, ApprovedBy: reservationUpdated.ApprovedBy },
        });

        // TX audit: inventory stock increment
        await txAuditLog(tx, req, {
          action: "INVENTORY_INCREMENT_REJECT",
          entityType: "product",
          entityId: r.ProductID,
          before: { Stock: beforeStock },
          after: { Stock: afterStock },
          meta: { reservationId, quantity: r.Quantity },
        });

        return { expired: false, data: reservationUpdated };
      });

      if (txRes?.expired) {
        return res.status(400).json({ success: false, message: "Reservation has expired" });
      }

      const updated = txRes?.data;

      console.log(
        `AUDIT: admin ${adminId} rejected reservation ${reservationId} (-> ${STATUS.REJECTED})`
      );

      return res.json({
        success: true,
        message: "Reservation rejected",
        data: updated,
      });
    } catch (err) {
      return res.status(err.status || 500).json({
        success: false,
        message: err.message || "Server error",
      });
    }
  }
);

/**
 * ---------------------------
 * ADMIN: Complete reservation
 * PATCH /api/reservations/admin/:id/complete
 *
 * Rules:
 *  - Only CONFIRMED -> COMPLETED
 * ---------------------------
 */
router.patch(
  "/admin/:id/complete",
  authenticateToken,
  authorizeRoles("ADMIN"),
  async (req, res) => {
    try {
      const reservationId = parseId(req.params.id);
      if (!reservationId) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid reservation id" });
      }

      const adminId = Number(req.user.dbId);

      const txRes = await prisma.$transaction(async (tx) => {
        const expired = await expireIfNeededTx(tx, reservationId);
        if (expired) return { expired: true };

        const r = await tx.reservation.findUnique({
          where: { ReservationID: reservationId },
        });

        if (!r) {
          const e = new Error("Reservation not found");
          e.status = 404;
          throw e;
        }

        const current = normStatus(r.Status);

        if (current !== STATUS.CONFIRMED) {
          const e = new Error(
            `Cannot complete a ${current.toLowerCase()} reservation`
          );
          e.status = 400;
          throw e;
        }

        const reservationUpdated = await tx.reservation.update({
          where: { ReservationID: reservationId },
          data: {
            Status: STATUS.COMPLETED,
            ApprovedBy: adminId,
          },
        });

        await txAuditLog(tx, req, {
          action: "RESERVATION_COMPLETE",
          entityType: "reservation",
          entityId: reservationId,
          before: { Status: current, ApprovedBy: r.ApprovedBy },
          after: { Status: reservationUpdated.Status, ApprovedBy: reservationUpdated.ApprovedBy },
        });

        return { expired: false, data: reservationUpdated };
      });

      if (txRes?.expired) {
        return res.status(400).json({ success: false, message: "Reservation has expired" });
      }

      const updated = txRes?.data;

      console.log(
        `AUDIT: admin ${adminId} completed reservation ${reservationId} (${STATUS.CONFIRMED} -> ${STATUS.COMPLETED})`
      );

      return res.json({
        success: true,
        message: "Reservation completed",
        data: updated,
      });
    } catch (err) {
      return res.status(err.status || 500).json({
        success: false,
        message: err.message || "Server error",
      });
    }
  }
);

/**
 * ---------------------------
 * ADMIN: Cancel reservation
 * PATCH /api/reservations/admin/:id/cancel
 *
 * Rules:
 *  - Allow cancel only if: PENDING/RESERVED/CONFIRMED
 *  - Block: CANCELLED/REJECTED/COMPLETED + any other unexpected state
 *  - Return stock once (same reasoning as reject)
 * ---------------------------
 */
router.patch(
  "/admin/:id/cancel",
  authenticateToken,
  authorizeRoles("ADMIN"),
  async (req, res) => {
    try {
      const reservationId = parseId(req.params.id);
      if (!reservationId) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid reservation id" });
      }

      const adminId = Number(req.user.dbId);

      const txRes = await prisma.$transaction(async (tx) => {
        const expired = await expireIfNeededTx(tx, reservationId);
        if (expired) return { expired: true };

        const r = await tx.reservation.findUnique({
          where: { ReservationID: reservationId },
        });

        if (!r) {
          const e = new Error("Reservation not found");
          e.status = 404;
          throw e;
        }

        const current = normStatus(r.Status);

        // ✅ STRICT allow-list
        const cancelAllowed = [
          STATUS.PENDING,
          STATUS.RESERVED,
          STATUS.CONFIRMED,
        ];
        if (!cancelAllowed.includes(current)) {
          const e = new Error(
            `Cannot cancel a ${current.toLowerCase()} reservation`
          );
          e.status = 400;
          throw e;
        }

        // No-op / safety: already-final should never happen due to allow-list,
        // but keep this guard for future changes.
        if (isFinal(current)) {
          const e = new Error(
            `Cannot cancel a ${current.toLowerCase()} reservation`
          );
          e.status = 400;
          throw e;
        }

        // stock BEFORE snapshot
        const prodBefore = await tx.product.findUnique({
          where: { ProductID: r.ProductID },
          select: { Stock: true },
        });
        const beforeStock = Number(prodBefore?.Stock || 0);

        // Return stock
        await tx.product.update({
          where: { ProductID: r.ProductID },
          data: { Stock: { increment: r.Quantity } },
        });

        const prodAfter = await tx.product.findUnique({
          where: { ProductID: r.ProductID },
          select: { Stock: true },
        });
        const afterStock = Number(prodAfter?.Stock || 0);

        const reservationUpdated = await tx.reservation.update({
          where: { ReservationID: reservationId },
          data: {
            Status: STATUS.CANCELLED,
            ApprovedBy: adminId,
          },
        });

        // TX audit: reservation status change
        await txAuditLog(tx, req, {
          action: "RESERVATION_CANCEL_ADMIN",
          entityType: "reservation",
          entityId: reservationId,
          before: { Status: current, ApprovedBy: r.ApprovedBy },
          after: { Status: reservationUpdated.Status, ApprovedBy: reservationUpdated.ApprovedBy },
        });

        // TX audit: inventory stock increment
        await txAuditLog(tx, req, {
          action: "INVENTORY_INCREMENT_CANCEL",
          entityType: "product",
          entityId: r.ProductID,
          before: { Stock: beforeStock },
          after: { Stock: afterStock },
          meta: { reservationId, quantity: r.Quantity },
        });

        return { expired: false, data: reservationUpdated };
      });

      if (txRes?.expired) {
        return res.status(400).json({ success: false, message: "Reservation has expired" });
      }

      const updated = txRes?.data;

      console.log(
        `AUDIT: admin ${adminId} cancelled reservation ${reservationId} (-> ${STATUS.CANCELLED})`
      );

      return res.json({
        success: true,
        message: "Reservation cancelled",
        data: updated,
      });
    } catch (err) {
      return res.status(err.status || 500).json({
        success: false,
        message: err.message || "Server error",
      });
    }
  }
);

module.exports = router;
