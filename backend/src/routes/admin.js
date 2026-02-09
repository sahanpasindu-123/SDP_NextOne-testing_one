const express = require("express");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");
const controller = require("../controllers/adminController");

const router = express.Router();

router.post(
  "/change-password",
  authenticateToken,
  authorizeRoles("ADMIN"),
  controller.changePassword
);

module.exports = router;
