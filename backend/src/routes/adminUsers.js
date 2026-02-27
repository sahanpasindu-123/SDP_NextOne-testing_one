const express = require("express");
const { listAllUsers, updateUser, deleteUser } = require("../controllers/adminUsersController");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");

const router = express.Router();

// ADMIN ONLY: protect entire /api/admin/users surface
router.get("/users", authenticateToken, authorizeRoles("ADMIN"), listAllUsers);
router.put("/users/:id", authenticateToken, authorizeRoles("ADMIN"), updateUser);
router.delete("/users/:id", authenticateToken, authorizeRoles("ADMIN"), deleteUser);

module.exports = router;
