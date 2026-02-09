const express = require("express");
const { listAllUsers } = require("../controllers/adminUsersController");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");

const router = express.Router();

// ADMIN ONLY: protect entire /api/admin/users surface
router.get("/users", authenticateToken, authorizeRoles("ADMIN"), listAllUsers);

module.exports = router;
