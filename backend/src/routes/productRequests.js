const express = require("express");
const router = express.Router();

const upload = require("../middleware/upload");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");
const ctrl = require("../controllers/productRequestController");

// employee submit
router.post(
  "/",
  authenticateToken,
  authorizeRoles("EMPLOYEE"),
  upload.single("image"),
  ctrl.createProductRequest
);

// admin list
router.get(
  "/",
  authenticateToken,
  authorizeRoles("ADMIN"),
  ctrl.listRequests
);

// admin approve
router.patch(
  "/:id/approve",
  authenticateToken,
  authorizeRoles("ADMIN"),
  ctrl.approveRequest
);

// admin reject
router.patch(
  "/:id/reject",
  authenticateToken,
  authorizeRoles("ADMIN"),
  ctrl.rejectRequest
);

module.exports = router;
