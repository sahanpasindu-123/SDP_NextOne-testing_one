const bcrypt = require("bcryptjs");
const prisma = require("../utils/prisma");

async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    // Token එකෙන් එන id -> "ADM001"
    const adminIdFromToken = req.user?.id;

    if (!adminIdFromToken) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "currentPassword and newPassword are required",
      });
    }

    // ✅ FIX: use AdminID (unique)
    const admin = await prisma.admin.findUnique({
      where: { AdminID: adminIdFromToken },
    });

    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    // ✅ FIX: DB field is Password (capital P)
    const ok = await bcrypt.compare(currentPassword, admin.Password);
    if (!ok) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    // ✅ FIX: update Password
    await prisma.admin.update({
      where: { AdminID: adminIdFromToken },
      data: { Password: hashed },
    });

    return res.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (err) {
    console.error("Admin changePassword error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update password",
    });
  }
}

module.exports = { changePassword };
