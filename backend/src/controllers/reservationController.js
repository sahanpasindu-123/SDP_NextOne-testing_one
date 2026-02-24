const prisma = require("../utils/prisma");

// ------------------------------
// CONFIRM RESERVATION
// ------------------------------
const confirmReservation = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const result = await prisma.$transaction(async (tx) => {
      // 1️⃣ Check reservation exists
      const existing = await tx.reservation.findUnique({
        where: { ReservationID: id },
      });

      if (!existing) {
        throw new Error("Reservation not found");
      }

      // 2️⃣ Prevent confirming cancelled reservation
      if (existing.Status === "CANCELLED") {
        throw new Error("Cannot confirm a cancelled reservation");
      }

      // 3️⃣ Prevent double confirm
      if (existing.Status === "CONFIRMED") {
        throw new Error("Reservation already confirmed");
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

    const existing = await prisma.reservation.findUnique({
      where: { ReservationID: id },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Reservation not found",
      });
    }

    // Prevent cancelling already cancelled reservation
    if (existing.Status === "CANCELLED") {
      return res.status(400).json({
        success: false,
        message: "Reservation already cancelled",
      });
    }

    const reservation = await prisma.reservation.update({
      where: { ReservationID: id },
      data: { Status: "CANCELLED" },
    });

    return res.json({ success: true, reservation });

  } catch (err) {
    return res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
};

module.exports = {
  confirmReservation,
  cancelReservation,
};
