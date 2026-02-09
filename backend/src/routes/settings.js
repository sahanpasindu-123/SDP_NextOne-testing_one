const express = require("express");
const router = express.Router();
const { authenticateToken, authorizeRoles } = require("../middleware/auth");
const settingsController = require("../controllers/settingsController");

// BACKUP
router.post(
  "/backup",
  authenticateToken,
  authorizeRoles("ADMIN"),
  settingsController.createBackup
);

router.get(
  "/backup",
  authenticateToken,
  authorizeRoles("ADMIN"),
  settingsController.listBackups
);

router.post(
  "/backup/restore",
  authenticateToken,
  authorizeRoles("ADMIN"),
  settingsController.restoreBackup
);

// EXPORT
router.get(
  "/export/:type",
  authenticateToken,
  authorizeRoles("ADMIN"),
  settingsController.exportData
);

module.exports = router;
