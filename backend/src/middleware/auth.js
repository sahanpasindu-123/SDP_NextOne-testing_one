const jwt = require("jsonwebtoken");
const prisma = require("../utils/prisma");

function getJwtSecret() {
  return process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
}

function getBearerToken(req) {
  const authHeader = req.headers?.authorization;
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

function isActive(user) {
  if (user == null) return false;
  if (typeof user.isActive === "boolean") return user.isActive;
  if (typeof user.is_active === "boolean") return user.is_active;
  return true;
}

function toInt(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeRole(input) {
  const raw = String(input || "").trim().toUpperCase();
  if (!raw) return "";
  // common normalizations
  if (raw === "ADMIN" || raw === "ADMINISTRATOR") return "ADMIN";
  if (raw === "EMPLOYEE" || raw === "STAFF") return "EMPLOYEE";
  if (raw === "CUSTOMER" || raw === "USER") return "CUSTOMER";
  return raw;
}

// Accept legacy/alternate token payload fields without weakening auth.
// We still validate by role-based DB lookup below.
function pickId(decoded) {
  if (!decoded || typeof decoded !== "object") return null;
  return (
    decoded.id ??
    decoded.userId ??
    decoded.employeeId ??
    decoded.adminId ??
    decoded.customerId ??
    null
  );
}

// ===============================
// AUTH MIDDLEWARE
// ===============================
const authenticateToken = async (req, res, next) => {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ success: false, message: "Access token required" });

    const secret = getJwtSecret();
    if (!secret) {
      return res.status(500).json({
        success: false,
        message: "JWT secret not configured (JWT_ACCESS_SECRET or JWT_SECRET)",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      if (err?.name === "TokenExpiredError") {
        return res.status(401).json({ success: false, message: "Token expired" });
      }
      return res.status(401).json({ success: false, message: "Invalid token" });
    }

    const role = normalizeRole(decoded.role);
    const rawId = pickId(decoded);

    if (!role || rawId == null) {
      return res.status(401).json({ success: false, message: "Invalid token payload" });
    }

    let user = null;

    // NOTE:
    // - ADMIN tokens should carry AdminID (string)
    // - EMPLOYEE tokens should carry employeeId (string)
    // - CUSTOMER tokens should carry CustomerID (number)
    // For backwards compatibility we also accept numeric PKs in `id`.
    const numericId = toInt(rawId);
    const stringId = String(rawId);

    if (role === "ADMIN") {
      // Prefer domain-unique ID (AdminID). Fall back to numeric PK if token was old.
      user = await prisma.admin.findUnique({ where: { AdminID: stringId } });
      if (!user && numericId != null) {
        user = await prisma.admin.findUnique({ where: { id: numericId } });
      }
    } else if (role === "EMPLOYEE") {
      // Prefer domain-unique ID (employeeId). Fall back to numeric PK if token was old.
      user = await prisma.employee.findUnique({ where: { employeeId: stringId } });
      if (!user && numericId != null) {
        user = await prisma.employee.findUnique({ where: { id: numericId } });
      }
    } else if (role === "CUSTOMER") {
      if (numericId == null) {
        return res.status(401).json({ success: false, message: "Invalid token payload" });
      }
      user = await prisma.customer.findUnique({ where: { CustomerID: numericId } });
    } else {
      return res.status(401).json({ success: false, message: "Invalid role" });
    }

    if (!user || !isActive(user)) {
      return res.status(401).json({ success: false, message: "Invalid or inactive user" });
    }

    // IMPORTANT: keep both forms available.
    // - req.user.id     -> domain-unique ID (AdminID / employeeId / CustomerID)
    // - req.user.dbId   -> numeric PK for joins/foreign keys (admin.id / employee.id / CustomerID)
    req.user = {
      id: role === "ADMIN" ? user.AdminID : role === "EMPLOYEE" ? user.employeeId : user.CustomerID,
      dbId: role === "CUSTOMER" ? user.CustomerID : user.id,
      role,
      externalId: user.AdminID ?? user.employeeId ?? null,
      name: user.Name ?? user.name ?? null,
      email: user.Email ?? user.email ?? null,
    };

    return next();
  } catch (err) {
    console.error("authenticateToken error:", err);
    return res.status(500).json({ success: false, message: "Authentication error" });
  }
};

// ===============================
// ROLE AUTHORIZATION
// ===============================
const authorizeRoles = (...roles) => {
  const allowed = roles.map((r) => String(r).toUpperCase());

  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ success: false, message: "Authentication required" });

    const userRole = String(req.user.role || "").toUpperCase();
    if (!allowed.includes(userRole)) {
      // Keep logs concise & only log failures (avoid noisy logs in production)
      console.warn("AUTHZ DENY", {
        role: userRole,
        allowed,
        method: req.method,
        path: req.originalUrl,
        userId: req.user?.id,
      });
      return res.status(403).json({ success: false, message: "Insufficient permissions", role: userRole });
    }

    return next();
  };
};

module.exports = { authenticateToken, authorizeRoles };
 