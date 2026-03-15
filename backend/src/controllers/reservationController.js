const prisma = require("../utils/prisma");
const { expireReservationIfNeededTx } = require("../services/reservationService");

function normStatus(s) {
  return String(s || "").trim().toUpperCase();
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
      if (!["PENDING", "RESERVED"].includes(current)) {
        const e = new Error(`Cannot confirm a ${current.toLowerCase()} reservation`);
        e.status = 400;
        throw e;
      }

      // 4) Update status
      // IMPORTANT: Do NOT block multiple confirmed reservations per product.
      // Stock is decremented at reservation creation time.
      const updateData = { Status: "CONFIRMED" };
      if (role === "ADMIN" && Number.isFinite(dbId) && dbId > 0) {
        updateData.ApprovedBy = dbId;
        updateData.approvedByUserId = dbId;
        updateData.approvedByRole = "ADMIN";
      }

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
      const cancelAllowed = ["PENDING", "RESERVED", "CONFIRMED"];
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
        data: { Status: "CANCELLED" },
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
  confirmReservation,
  cancelReservation,
};
