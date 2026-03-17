const prisma = require("../utils/prisma");
const { expireReservationIfNeededTx } = require("../services/reservationService");

function normStatus(s) {
  return String(s || "").trim().toUpperCase();
}

const RESERVATION_STATUS = Object.freeze({
  PENDING: "PENDING",
  RESERVED: "RESERVED",
  CONFIRMED: "CONFIRMED",
  CANCELLED: "CANCELLED",
  REJECTED: "REJECTED",
  COMPLETED: "COMPLETED",
});

function isPendingLike(s) {
  return [RESERVATION_STATUS.PENDING, RESERVATION_STATUS.RESERVED].includes(normStatus(s));
}

function isFinal(s) {
  return [
    RESERVATION_STATUS.CANCELLED,
    RESERVATION_STATUS.REJECTED,
    RESERVATION_STATUS.COMPLETED,
  ].includes(normStatus(s));
}

function actorUpdateForReservation(role, dbId) {
  const r = normStatus(role);
  const id = Number(dbId);
  if (!Number.isFinite(id) || id <= 0) return {};

  if (r === "ADMIN") {
    return { ApprovedBy: id, approvedByUserId: id, approvedByRole: "ADMIN" };
  }
  if (r === "EMPLOYEE") {
    // ApprovedBy is an ADMIN foreign key; keep it null for employee actions.
    return { ApprovedBy: null, approvedByUserId: id, approvedByRole: "EMPLOYEE" };
  }
  return {};
}

// ------------------------------
// CONFIRM RESERVATION
// ------------------------------
const confirmReservation = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }

    const txRes = await prisma.$transaction(async (tx) => {
      // 1) Check reservation exists
      const existing = await tx.reservation.findUnique({
        where: { ReservationID: id },
      });

      if (!existing) {
        const e = new Error("Reservation not found");
        e.status = 404;
        throw e;
      }

      const role = normStatus(req.user?.role);
      const dbId = Number(req.user?.dbId);

      // CUSTOMER must only confirm their own reservation
      if (role === "CUSTOMER") {
        if (!Number.isFinite(dbId) || Number(existing.CustomerID) !== dbId) {
          const e = new Error("Reservation not found");
          e.status = 404;
          throw e;
        }
      }

      // Enforce expiry (3-day rule) before allowing state changes
      const exp = await expireReservationIfNeededTx(tx, id);
      if (exp?.expired) {
        const updated = await tx.reservation.findUnique({
          where: { ReservationID: id },
        });
        return { expired: true, reservation: updated };
      }

      const current = normStatus(existing.Status);

      // 2) Prevent double confirm
      if (current === "CONFIRMED") {
        const e = new Error("Reservation already confirmed");
        e.status = 400;
        throw e;
      }

      // 3) Allow only PENDING/RESERVED -> CONFIRMED
      if (!isPendingLike(current)) {
        const e = new Error(`Cannot confirm a ${current.toLowerCase()} reservation`);
        e.status = 400;
        throw e;
      }

      // 4) Update status
      // IMPORTANT: Do NOT block multiple confirmed reservations per product.
      // Stock is decremented at reservation creation time.
      const updateData = { Status: RESERVATION_STATUS.CONFIRMED, ...actorUpdateForReservation(role, dbId) };

      const updated = await tx.reservation.update({
        where: { ReservationID: id },
        data: updateData,
      });

      return { expired: false, reservation: updated };
    });

    if (txRes?.expired) {
      return res.status(400).json({
        success: false,
        message: "Reservation has expired",
        reservation: txRes?.reservation || null,
      });
    }

    return res.json({
      success: true,
      message: "Reservation confirmed",
      reservation: txRes?.reservation,
      data: txRes?.reservation, // backward-compatible alias
    });

  } catch (err) {
    return res.status(err.status || 400).json({
      success: false,
      message: err.message || "Server error",
    });
  }
};


// ------------------------------
// CANCEL RESERVATION
// ------------------------------
const cancelReservation = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }

    const reservation = await prisma.$transaction(async (tx) => {
      const existing = await tx.reservation.findUnique({
        where: { ReservationID: id },
      });

      if (!existing) {
        const e = new Error("Reservation not found");
        e.status = 404;
        throw e;
      }

      const role = normStatus(req.user?.role);
      const dbId = Number(req.user?.dbId);

      // CUSTOMER must only cancel their own reservation
      if (role === "CUSTOMER") {
        if (!Number.isFinite(dbId) || Number(existing.CustomerID) !== dbId) {
          const e = new Error("Reservation not found");
          e.status = 404;
          throw e;
        }
      }

      // If expired, expire it (stock restore) and return the updated row.
      const exp = await expireReservationIfNeededTx(tx, id);
      if (exp?.expired) {
        return await tx.reservation.findUnique({ where: { ReservationID: id } });
      }

      const current = normStatus(existing.Status);
      const cancelAllowed = [
        RESERVATION_STATUS.PENDING,
        RESERVATION_STATUS.RESERVED,
        RESERVATION_STATUS.CONFIRMED,
      ];
      if (!cancelAllowed.includes(current)) {
        const e = new Error(
          `Cannot cancel a ${current.toLowerCase()} reservation`
        );
        e.status = 400;
        throw e;
      }

      // Return stock on customer cancel (prevents stock leakage)
      await tx.product.update({
        where: { ProductID: existing.ProductID },
        data: { Stock: { increment: existing.Quantity } },
      });

      return await tx.reservation.update({
        where: { ReservationID: id },
        data: { Status: RESERVATION_STATUS.CANCELLED },
      });
    });

    return res.json({ success: true, reservation });

  } catch (err) {
    return res.status(err.status || 500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
};

module.exports = {
  RESERVATION_STATUS,
  normStatus,
  isPendingLike,
  isFinal,
  actorUpdateForReservation,
  confirmReservation,
  cancelReservation,
};
