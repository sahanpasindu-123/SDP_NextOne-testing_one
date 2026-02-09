const express = require("express");
const {
  createContact,
  getMyContacts,
} = require("../controllers/contactsController");
const {
  authenticateToken,
  authorizeRoles,
} = require("../middleware/auth");

const router = express.Router();

// Customer sends a contact message
router.post(
  "/",
  authenticateToken,
  authorizeRoles("CUSTOMER"),
  createContact
);

// (Optional) Customer views own contact messages
router.get(
  "/my",
  authenticateToken,
  authorizeRoles("CUSTOMER"),
  getMyContacts
);
module.exports = router;
