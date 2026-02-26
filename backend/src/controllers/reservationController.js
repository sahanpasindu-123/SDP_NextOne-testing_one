const prisma = require("../utils/prisma");

// ------------------------------
// CONFIRM RESERVATION
// ------------------------------
const confirmReservation = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1️⃣ Check reservation exists
      const existing = await tx.reservation.findUnique({
        where: { ReservationID: id },
      });

      if (!existing) {
        throw new Error("Reservation not found");
      }

      const current = String(existing.Status || "").toUpperCase();

      // 2️⃣ Prevent double confirm
      if (current === "CONFIRMED") {
        throw new Error("Reservation already confirmed");
      }

      // 3️⃣ Allow only PENDING/RESERVED -> CONFIRMED
      if (!["PENDING", "RESERVED"].includes(current)) {
        throw new Error(`Cannot confirm a ${current.toLowerCase()} reservation`);
      }

      // 4️⃣ Ensure product not already confirmed elsewhere
      const productConflict = await tx.reservation.findFirst({
        where: {
          ProductID: existing.ProductID,
          Status: "CONFIRMED",
          NOT: { ReservationID: id },
        },
      });

      if (productConflict) {
        throw new Error("This product is already confirmed by another reservation");
      }

      // 5️⃣ Update status
      return await tx.reservation.update({
        where: { ReservationID: id },
        data: { Status: "CONFIRMED" },
      });
    });

    return res.json({ success: true, reservation: result });

  } catch (err) {
    return res.status(400).json({
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

      const current = String(existing.Status || "").toUpperCase();
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
