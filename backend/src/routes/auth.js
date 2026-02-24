const express = require("express");
const rateLimit = require("express-rate-limit");

const authController = require("../controllers/authController");
const { authenticateToken } = require("../middleware/auth");
const { validate } = require("../middleware/validate");

const {
  LoginSchema,
  CustomerSignupSchema,
  EmailSchema,
  ResetPasswordSchema,
  VerifyCodeSchema,
} = require("../validators/auth.validators");

const router = express.Router();

/* ================= RATE LIMITERS ================= */

// Prevent brute force on login routes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window per IP
  message: {
    success: false,
    message: "Too many login attempts. Please try again later.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/* ================= TEST ================= */

router.get("/ping", (req, res) => {
  res.json({ success: true, message: "Auth route OK" });
});

/* ================= STAFF ================= */

// Backward-compatible login
router.post(
  "/login",
  loginLimiter,
  validate(LoginSchema),
  authController.login
);

// Staff login (admin / employee)
router.post(
  "/staff-login",
  loginLimiter,
  validate(LoginSchema),
  authController.staffLogin
);

/* ================= CUSTOMER ================= */

// Signup
router.post(
  "/customer-signup",
  validate(CustomerSignupSchema),
  authController.customerSignup
);

// Login
router.post(
  "/customer-login",
  loginLimiter,
  validate(LoginSchema),
  authController.customerLogin
);

/* ================= EMAIL VERIFICATION ================= */

router.post(
  "/verify-email",
  validate(VerifyCodeSchema),
  authController.verifyEmail
);

router.post(
  "/resend-verification",
  validate(EmailSchema),
  authController.resendVerification
);

/* ================= FORGOT PASSWORD FLOW ================= */

router.post(
  "/forgot-password",
  validate(EmailSchema),
  authController.forgotPassword
);

router.post(
  "/verify-code",
  validate(VerifyCodeSchema),
  authController.verifyResetCode
);

router.post(
  "/reset-password",
  validate(ResetPasswordSchema),
  authController.resetPassword
);

/* ================= USER ================= */

router.get(
  "/me",
  authenticateToken,
  authController.me
);

module.exports = router;
