const prisma = require("../utils/prisma");

const confirmReservation = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const reservation = await prisma.reservation.update({
      where: { ReservationID: id },
      data: { Status: "CONFIRMED" },
    });

    return res.json({ success: true, reservation });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

const cancelReservation = async (req, res) => {
  try {
    const id = Number(req.params.id);

    const reservation = await prisma.reservation.update({
      where: { ReservationID: id },
      data: { Status: "CANCELLED" },
    });

    return res.json({ success: true, reservation });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

module.exports = {
  confirmReservation,
  cancelReservation,
};
