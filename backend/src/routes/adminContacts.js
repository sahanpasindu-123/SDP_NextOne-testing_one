const express = require("express");
const {
  getAllContacts,
  getContactById,
  replyToContact,
} = require("../controllers/adminContactsController");
const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/auth");

const router = express.Router();

// Admin: get all contact messages
router.get(
  "/",
  authenticateToken,
  authorizeRoles("ADMIN"),
  getAllContacts
);

// Admin: get single contact message
router.get(
  "/:id",
  authenticateToken,
  authorizeRoles("ADMIN"),
  getContactById
);

// Admin: reply to contact message
router.post(
  "/:id/reply",
  authenticateToken,
  authorizeRoles("ADMIN"),
  replyToContact
);

module.exports = router;
