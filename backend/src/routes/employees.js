const express = require("express");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");
const controller = require("../controllers/employeeController");

const router = express.Router();

// ===============================
// Admin routes
// ===============================
router.get(
  "/",
  authenticateToken,
  authorizeRoles("ADMIN"),
  controller.listEmployees
);

router.post(
  "/",
  authenticateToken,
  authorizeRoles("ADMIN"),
  controller.createEmployee
);

// ===============================
// Employee: Change Password
// ===============================
router.post(
  "/change-password",
  authenticateToken,
  authorizeRoles("EMPLOYEE"),
  controller.changePassword
);

module.exports = router;
