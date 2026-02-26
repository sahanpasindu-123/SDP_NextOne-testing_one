require("../config/env");

const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../utils/prisma");
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

/* ================= EMAIL VALIDATION ================= */

function isValidEmail(email) {
  if (!email) return false;

  const cleaned = String(email).trim().toLowerCase();
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  return regex.test(cleaned);
}

/* ================= PHONE VALIDATION (Sri Lanka) ================= */

function isValidSLPhone(phone) {
  if (!phone) return false;
  const cleaned = String(phone).replace(/\s+/g, "");
  const regex = /^(?:\+94|94|0)7\d{8}$/;
  return regex.test(cleaned);
}

function normalizeSLPhone(phone) {
  let p = String(phone).replace(/\s+/g, "");

  if (p.startsWith("+94")) return p;
  if (p.startsWith("94")) return `+${p}`;
  if (p.startsWith("0")) return `+94${p.slice(1)}`;

  return p;
}

/* ================= HELPERS ================= */

function getJwtSecret() {
  return process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
}

function signToken(payload) {
  const secret = getJwtSecret();
  if (!secret) throw new Error("JWT secret missing in .env");
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
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

const login = async (req, res) => {
  try {
    const { adminId, employeeId, password } = req.body || {};

    if (adminId || employeeId) return staffLogin(req, res);

    return res.status(400).json({
      success: false,
      message: "employeeId (or adminId) and password required",
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/* ================= STAFF LOGIN ================= */

const staffLogin = async (req, res) => {
  try {
    const { adminId, employeeId, password } = req.body || {};

    const normalizedAdminId = adminId ? String(adminId).trim() : null;
    const normalizedEmployeeId = employeeId ? String(employeeId).trim() : null;

    if (!password) {
      return res.status(400).json({ success: false, message: "password required" });
    }

    if (!normalizedAdminId && !normalizedEmployeeId) {
      return res.status(400).json({ success: false, message: "employeeId (or adminId) required" });
    }

    if (normalizedAdminId) {
      const admin = await prisma.admin.findUnique({
        where: { AdminID: normalizedAdminId },
      });

      if (!admin || !(await bcrypt.compare(String(password), admin.Password))) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
      }

      const token = signToken({ id: admin.id, role: "ADMIN", code: admin.AdminID });
      return res.json({ success: true, token, role: "ADMIN" });
    }

    if (normalizedEmployeeId) {
      const employee = await prisma.employee.findUnique({
        where: { employeeId: normalizedEmployeeId },
      });

      if (!employee || !employee.isActive || !(await bcrypt.compare(String(password), employee.password))) {
        return res.status(401).json({ success: false, message: "Invalid credentials" });
      }

      const token = signToken({ id: employee.id, role: "EMPLOYEE", code: employee.employeeId });
      return res.json({ success: true, token, role: "EMPLOYEE" });
    }

    return res.status(400).json({ success: false, message: "employeeId (or adminId) required" });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
};

/* ================= CUSTOMER SIGNUP ================= */

async function customerSignup(req, res) {
  try {
    const { name, email, contact, password } = req.body || {};

    if (!name || !email || !contact || !password) {
      return res.status(400).json({ success: false, message: "All fields required" });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ success: false, message: "Invalid email address" });
    }

    if (!isValidSLPhone(contact)) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number. Use 0771234567 or +94771234567",
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

    if (existing && !existing.emailVerified) {
      await prisma.customer.update({
        where: { Email: cleanEmail },
        data: { emailVerifyCode: code, emailVerifyExpires: expires },
      });

      fireAndForgetEmail({
        to: cleanEmail,
        subject: "Verify your email",
        text: `Your verification code is ${code}`,
      });

      return res.json({ success: true, message: "Verification code resent" });
    }

    const hash = await bcrypt.hash(String(password), 10);

    await prisma.customer.create({
      data: {
        Name: String(name).trim(),
        Email: cleanEmail,
        Phone: normalizedContact,
        PasswordHash: hash,
        emailVerified: false,
        emailVerifyCode: code,
        emailVerifyExpires: expires,
        isActive: true,
      },
    });

    fireAndForgetEmail({
      to: cleanEmail,
      subject: "Verify your email",
      text: `Your verification code is ${code}`,
    });

    return res.status(201).json({ success: true, message: "Signup success. Verify email." });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

/* ================= VERIFY EMAIL ================= */

async function verifyEmail(req, res) {
  try {
    const { email, code } = req.body || {};

    if (!email || !code || !isValidEmail(email)) {
      return res.status(400).json({ success: false, message: "Invalid email or code" });
    }

    const cleanEmail = email.trim().toLowerCase();

    const customer = await prisma.customer.findUnique({ where: { Email: cleanEmail } });
    if (!customer) return res.status(404).json({ success: false, message: "User not found" });

    if (customer.emailVerified) {
      const token = signToken({ id: customer.CustomerID, role: "CUSTOMER" });
      return res.json({ success: true, token });
    }

    if (customer.emailVerifyCode !== code || new Date(customer.emailVerifyExpires) < new Date()) {
      return res.status(400).json({ success: false, message: "Invalid or expired code" });
    }

    await prisma.customer.update({
      where: { Email: cleanEmail },
      data: { emailVerified: true, emailVerifyCode: null, emailVerifyExpires: null },
    });

    const token = signToken({ id: customer.CustomerID, role: "CUSTOMER" });
    return res.json({ success: true, token });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

/* ================= CUSTOMER LOGIN ================= */

async function customerLogin(req, res) {
  try {
    const { email, password } = req.body || {};

    if (!email || !password || !isValidEmail(email)) {
      return res.status(400).json({ success: false, message: "Invalid email or password" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const customer = await prisma.customer.findUnique({ where: { Email: cleanEmail } });

    if (!customer || !customer.isActive) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    if (!customer.emailVerified) {
      return res.status(403).json({
        success: false,
        message: "Email not verified",
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

/* ================= FORGOT / RESET ================= */

async function forgotPassword(req, res) {
  try {
    const { email } = req.body || {};

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ success: false, message: "Invalid email" });
    }

    const cleanEmail = email.trim().toLowerCase();
    const customer = await prisma.customer.findUnique({ where: { Email: cleanEmail } });

    if (!customer || !customer.isActive) {
      return res.json({ success: true });
    }

    const code = generateCode6();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.passwordResetCode.create({
      data: { customerId: customer.CustomerID, code, expiresAt },
    });

    fireAndForgetEmail({
      to: cleanEmail,
      subject: "Password Reset Code",
      text: `Your password reset code is ${code}`,
    });

    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

/* ================= RESEND VERIFICATION ================= */
async function resendVerification(req, res) {
  try {
    const { email } = req.body || {};

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    const customer = await prisma.customer.findUnique({
      where: { Email: cleanEmail },
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (customer.emailVerified) {
      return res.json({
        success: true,
        message: "Email already verified",
      });
    }

    const code = generateCode6();
    const expires = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.customer.update({
      where: { Email: cleanEmail },
      data: {
        emailVerifyCode: code,
        emailVerifyExpires: expires,
      },
    });

    fireAndForgetEmail({
      to: cleanEmail,
      subject: "Verify your email",
      text: `Your verification code is ${code}. It expires in 10 minutes.`,
    });

    return res.json({
      success: true,
      message: "Verification code resent",
    });
  } catch (e) {
    return res.status(500).json({
      success: false,
      message: e.message,
    });
  }
}


async function verifyResetCode(req, res) {
  try {
    const { email, code } = req.body || {};

    if (!email || !code || !isValidEmail(email)) {
      return res.status(400).json({ success: false });
    }

    const cleanEmail = email.trim().toLowerCase();
    const customer = await prisma.customer.findUnique({ where: { Email: cleanEmail } });
    if (!customer) return res.status(400).json({ success: false });

    const record = await prisma.passwordResetCode.findFirst({
      where: {
        customerId: customer.CustomerID,
        code,
        usedAt: null,
        expiresAt: { gte: new Date() },
      },
    });

    if (!record) {
      return res.status(400).json({ success: false });
    }

    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ success: false, message: e.message });
  }
}

async function resetPassword(req, res) {
  try {
    const { email, code, newPassword } = req.body || {};

    if (!email || !code || !newPassword || !isValidEmail(email)) {
      return res.status(400).json({ success: false });
    }

    const pw = validateStrongPassword(newPassword);
    if (!pw.ok) return res.status(400).json({ success: false, message: pw.message });

    const cleanEmail = email.trim().toLowerCase();
    const customer = await prisma.customer.findUnique({ where: { Email: cleanEmail } });
    if (!customer) return res.status(400).json({ success: false });

    const record = await prisma.passwordResetCode.findFirst({
      where: {
        customerId: customer.CustomerID,
        code,
        usedAt: null,
        expiresAt: { gte: new Date() },
      },
    });

    if (!record) {
      return res.status(400).json({ success: false });
    }

    const hash = await bcrypt.hash(String(newPassword), 10);

    await prisma.$transaction([
      prisma.customer.update({
        where: { CustomerID: customer.CustomerID },
        data: { PasswordHash: hash },
      }),
      prisma.passwordResetCode.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return res.json({ success: true });
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
