const express = require("express");
const authController = require("../controllers/authController");
const { authenticateToken } = require("../middleware/auth");

const router = express.Router();

/* ================= TEST ================= */
router.get("/ping", (req, res) => {
  res.json({ success: true, message: "Auth route OK" });
});

/* ================= STAFF ================= */
router.post("/login", authController.login);
router.post("/staff-login", authController.staffLogin);

/* ================= CUSTOMER ================= */
router.post("/customer-signup", authController.customerSignup);
router.post("/customer-login", authController.customerLogin);

// Email verification
router.post("/verify-email", authController.verifyEmail);
router.post("/resend-verification", authController.resendVerification);

/* ================= FORGOT PASSWORD FLOW ================= */
router.post("/forgot-password", authController.forgotPassword);
router.post("/verify-code", authController.verifyResetCode);
router.post("/reset-password", authController.resetPassword);

/* ================= USER ================= */
router.get("/me", authenticateToken, authController.me);

module.exports = router;
