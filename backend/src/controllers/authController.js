require("../config/env");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../utils/prisma");
// utils/mailer exports sendMail and provides sendEmail alias for backwards-compat.
const { sendEmail } = require("../utils/mailer");

/* ================= PASSWORD VALIDATION ================= */

function validateStrongPassword(password) {
  if (typeof password !== "string") return { ok: false, message: "Password must be a string" };

  const p = password.trim();

  if (p.length < 8) return { ok: false, message: "Password must be at least 8 characters" };
  if (!/[a-z]/.test(p)) return { ok: false, message: "Password must include at least 1 lowercase letter" };
  if (!/[A-Z]/.test(p)) return { ok: false, message: "Password must include at least 1 uppercase letter" };
  if (!/[0-9]/.test(p)) return { ok: false, message: "Password must include at least 1 number" };
  if (!/[!@#$%^&*(),.?":{}|<>_\-\\[\]\/~`+=;'@]/.test(p)) {
    return { ok: false, message: "Password must include at least 1 special character" };
  }
  if (/\s/.test(p)) return { ok: false, message: "Password must not contain spaces" };

  return { ok: true };
}

/* ================= PHONE VALIDATION (Sri Lanka) ================= */

// Accept: 07XXXXXXXX, 947XXXXXXXX, +947XXXXXXXX
function isValidSLPhone(phone) {
  if (!phone) return false;
  const cleaned = String(phone).replace(/\s+/g, "");
  const regex = /^(?:\+94|94|0)7\d{8}$/;
  return regex.test(cleaned);
}

// Normalize to: +947XXXXXXXX
function normalizeSLPhone(phone) {
  let p = String(phone).replace(/\s+/g, "");

  if (p.startsWith("+94")) return p;
  if (p.startsWith("94")) return `+${p}`;
  if (p.startsWith("0")) return `+94${p.slice(1)}`;

  // fallback: return as-is (will fail validation earlier if invalid)
  return p;
}

/* ================= HELPERS ================= */

function getJwtSecret() {
  return process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
}

function signToken(payload) {
  const secret = getJwtSecret();
  if (!secret) throw new Error("JWT secret missing in .env (JWT_ACCESS_SECRET or JWT_SECRET)");
  return jwt.sign(payload, secret, {
    expiresIn: process.env.JWT_EXPIRES_IN || "1d",
  });
}

function generateCode6() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function fireAndForgetEmail({ to, subject, text }) {
  sendEmail({ to, subject, text }).catch((err) => {
    console.error("Email send failed:", err?.message || err);
  });
}

/* ================= BASIC ================= */

const me = async (req, res) => {
  try {
    return res.status(200).json({ success: true, user: req.user || null });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error", error: err.message });
  }
};

// kept for compatibility
// POST /api/auth/login
// Backwards-compatible alias:
//  - If body has adminId/employeeId => staff login
//  - Else if body has email/password => customer login
const login = async (req, res) => {
  try {
    const { adminId, employeeId, email, password } = req.body || {};

    if (adminId || employeeId) {
      return staffLogin(req, res);
    }

    if (email && password) {
      return customerLogin(req, res);
    }

    return res.status(400).json({
      success: false,
      message: "Provide either (adminId/employeeId + password) or (email + password)",
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ================= STAFF LOGIN ================= */
/**
 * POST /api/auth/staff-login
 * body: { adminId? (string), employeeId? (string), password }
 *
 * ✅ Token payload now uses numeric PK:
 *  - ADMIN: { id: admin.id, role: "ADMIN", code: admin.AdminID }
 *  - EMPLOYEE: { id: employee.id, role: "EMPLOYEE", code: employee.employeeId }
 */
const staffLogin = async (req, res) => {
  try {
    const { adminId, employeeId, password } = req.body || {};

    if (!password) {
      return res.status(400).json({ success: false, message: "password required" });
    }

    if (adminId) {
      const admin = await prisma.admin.findUnique({
        where: { AdminID: String(adminId) },
      });

      if (!admin || !(await bcrypt.compare(String(password), admin.Password))) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
      }

      const token = signToken({ id: admin.id, role: "ADMIN", code: admin.AdminID });
      return res.json({ success: true, token, role: "ADMIN" });
    }

    if (employeeId) {
      const employee = await prisma.employee.findUnique({
        where: { employeeId: String(employeeId) },
      });

      if (!employee || !employee.isActive || !(await bcrypt.compare(String(password), employee.password))) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
      }

      const token = signToken({ id: employee.id, role: "EMPLOYEE", code: employee.employeeId });
      return res.json({ success: true, token, role: "EMPLOYEE" });
    }

    return res.status(400).json({ success: false, message: "adminId or employeeId required" });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

/* ================= CUSTOMER SIGNUP ================= */
/**
 * POST /api/auth/customer-signup
 * body: { name, email, contact, password }
 *
 * Creates user if not exists.
 * If exists but not verified: resend code.
 */
async function customerSignup(req, res) {
  try {
    const { name, email, contact, password } = req.body || {};

    if (!name || !email || !contact || !password) {
      return res.status(400).json({ success: false, message: "All fields required" });
    }

    // ✅ Phone validate + normalize
    if (!isValidSLPhone(contact)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number. Use 0771234567 or +94771234567 format.",
      });
    }
    const normalizedContact = normalizeSLPhone(contact);

    const pw = validateStrongPassword(password);
    if (!pw.ok) return res.status(400).json({ success: false, message: pw.message });

    const cleanEmail = String(email).trim().toLowerCase();
    const code = generateCode6();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    const existing = await prisma.customer.findUnique({
      where: { Email: cleanEmail },
    });

    if (existing && existing.emailVerified) {
      return res.status(409).json({ success: false, message: "Email already registered" });
    }

    // exists but not verified -> resend
    if (existing && !existing.emailVerified) {
      await prisma.customer.update({
        where: { Email: cleanEmail },
        data: { emailVerifyCode: code, emailVerifyExpires: expires },
      });

      res.json({ success: true, message: "Verification code resent", email: cleanEmail });

      fireAndForgetEmail({
        to: cleanEmail,
        subject: "Verify your email",
        text: `Your verification code is ${code}. It expires in 10 minutes.`,
      });
      return;
    }

    const hash = await bcrypt.hash(String(password), 10);

    await prisma.customer.create({
      data: {
        Name: String(name).trim(),
        Email: cleanEmail,
        Phone: normalizedContact, // ✅ always +94 format
        PasswordHash: hash,
        emailVerified: false,
        emailVerifyCode: code,
        emailVerifyExpires: expires,
        isActive: true,
      },
    });

    res.status(201).json({ success: true, message: "Signup success. Verify email.", email: cleanEmail });

    fireAndForgetEmail({
      to: cleanEmail,
      subject: "Verify your email",
      text: `Your verification code is ${code}. It expires in 10 minutes.`,
    });

    return;
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

/* ================= VERIFY EMAIL ================= */
async function verifyEmail(req, res) {
  try {
    const { email, code } = req.body || {};

    if (!email || !code) {
      return res.status(400).json({ success: false, message: "email and code required" });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const inputCode = String(code).trim();

    const customer = await prisma.customer.findUnique({ where: { Email: cleanEmail } });

    if (!customer) return res.status(404).json({ success: false, message: "User not found" });

    if (customer.emailVerified) {
      const token = signToken({ id: customer.CustomerID, role: "CUSTOMER" });
      return res.json({ success: true, token, message: "Already verified" });
    }

    const expired = !customer.emailVerifyExpires || new Date(customer.emailVerifyExpires) < new Date();
    const invalid = customer.emailVerifyCode !== inputCode;

    if (invalid || expired) {
      return res.status(400).json({ success: false, message: "Invalid or expired code" });
    }

    await prisma.customer.update({
      where: { Email: cleanEmail },
      data: { emailVerified: true, emailVerifyCode: null, emailVerifyExpires: null },
    });

    const token = signToken({ id: customer.CustomerID, role: "CUSTOMER" });
    return res.json({ success: true, token, message: "Email verified" });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

/* ================= CUSTOMER LOGIN ================= */
async function customerLogin(req, res) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ success: false, message: "email and password required" });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const customer = await prisma.customer.findUnique({ where: { Email: cleanEmail } });

    if (!customer || !customer.isActive) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    if (!customer.emailVerified) {
      return res.status(403).json({
        success: false,
        message: "Email not verified. Please verify your email.",
        code: "EMAIL_NOT_VERIFIED",
      });
    }

    if (!(await bcrypt.compare(String(password), customer.PasswordHash))) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = signToken({ id: customer.CustomerID, role: "CUSTOMER" });

    await prisma.customer.update({
      where: { CustomerID: customer.CustomerID },
      data: { lastLogin: new Date() },
    });

    return res.json({ success: true, token });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

/* ================= FORGOT PASSWORD ================= */
async function forgotPassword(req, res) {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ success: false, message: "Email required" });

    const cleanEmail = String(email).trim().toLowerCase();
    const customer = await prisma.customer.findUnique({ where: { Email: cleanEmail } });

    if (!customer || !customer.isActive) {
      return res.json({ success: true, message: "If the email exists, a reset code was sent" });
    }

    const code = generateCode6();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.passwordResetCode.updateMany({
      where: { customerId: customer.CustomerID, usedAt: null },
      data: { usedAt: new Date() },
    });

    await prisma.passwordResetCode.create({
      data: { customerId: customer.CustomerID, code, expiresAt },
    });

    res.json({ success: true, message: "Reset code sent" });

    fireAndForgetEmail({
      to: cleanEmail,
      subject: "Password Reset Code",
      text: `Your password reset code is ${code}. It expires in 10 minutes.`,
    });

    return;
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

/* ================= VERIFY RESET CODE ================= */
async function verifyResetCode(req, res) {
  try {
    const { email, code } = req.body || {};

    if (!email || !code) {
      return res.status(400).json({ success: false, message: "email and code required" });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const inputCode = String(code).trim();

    const customer = await prisma.customer.findUnique({ where: { Email: cleanEmail } });
    if (!customer || !customer.isActive) {
      return res.status(400).json({ success: false, message: "Invalid or expired code" });
    }

    const now = new Date();

    const record = await prisma.passwordResetCode.findFirst({
      where: {
        customerId: customer.CustomerID,
        code: inputCode,
        usedAt: null,
        expiresAt: { gte: now },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      return res.status(400).json({ success: false, message: "Invalid or expired code" });
    }

    return res.json({ success: true, message: "Code verified" });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

/* ================= RESEND VERIFICATION ================= */
async function resendVerification(req, res) {
  try {
    const { email } = req.body || {};

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const customer = await prisma.customer.findUnique({
      where: { Email: cleanEmail },
    });

    if (!customer) return res.status(404).json({ success: false, message: "User not found" });

    if (customer.emailVerified === true) {
      return res.json({ success: true, message: "Email already verified" });
    }

    const code = generateCode6();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.customer.update({
      where: { Email: cleanEmail },
      data: { emailVerifyCode: code, emailVerifyExpires: expires },
    });

    res.json({ success: true, message: "Verification code resent" });

    fireAndForgetEmail({
      to: cleanEmail,
      subject: "Verify your email",
      text: `Your verification code is ${code}. It expires in 10 minutes.`,
    });

    return;
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

/* ================= RESET PASSWORD ================= */
async function resetPassword(req, res) {
  try {
    const { email, code, newPassword } = req.body || {};

    if (!email || !code || !newPassword) {
      return res.status(400).json({ success: false, message: "email, code, newPassword required" });
    }

    const pw = validateStrongPassword(newPassword);
    if (!pw.ok) return res.status(400).json({ success: false, message: pw.message });

    const cleanEmail = String(email).trim().toLowerCase();
    const inputCode = String(code).trim();

    const customer = await prisma.customer.findUnique({ where: { Email: cleanEmail } });
    if (!customer || !customer.isActive) {
      return res.status(400).json({ success: false, message: "Invalid or expired code" });
    }

    const now = new Date();

    const record = await prisma.passwordResetCode.findFirst({
      where: {
        customerId: customer.CustomerID,
        code: inputCode,
        usedAt: null,
        expiresAt: { gte: now },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      return res.status(400).json({ success: false, message: "Invalid or expired code" });
    }

    const hash = await bcrypt.hash(String(newPassword), 10);

    await prisma.$transaction([
      prisma.customer.update({
        where: { CustomerID: customer.CustomerID },
        data: { PasswordHash: hash },
      }),
      prisma.passwordResetCode.update({
        where: { id: record.id },
        data: { usedAt: now },
      }),
      prisma.passwordResetCode.updateMany({
        where: { customerId: customer.CustomerID, usedAt: null },
        data: { usedAt: now },
      }),
    ]);

    return res.json({ success: true, message: "Password reset successful" });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

module.exports = {
  staffLogin,
  login,
  me,
  customerSignup,
  customerLogin,
  verifyEmail,
  resendVerification,
  forgotPassword,
  verifyResetCode,
  resetPassword,
};
