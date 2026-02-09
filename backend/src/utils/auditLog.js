const prisma = require("./prisma");

function safeJson(v) {
  try {
    return v == null ? null : JSON.stringify(v);
  } catch {
    return null;
  }
}

// Usage: await writeAuditLog(req, { action, entityType, entityId, before, after, meta })
async function writeAuditLog(req, { action, entityType, entityId, before, after, meta }) {
  const role = String(req.user?.role || "").toUpperCase();
  const dbId = req.user?.dbId;

  const data = {
    actorRole: role || "UNKNOWN",
    action,
    entityType,
    entityId: String(entityId),
    beforeData: safeJson(before),
    afterData: safeJson(after),
    meta: safeJson({
      ...(meta || {}),
      ip: req.ip,
      userAgent: req.headers["user-agent"],
      path: req.originalUrl,
      method: req.method,
    }),
    adminId: null,
    employeeId: null,
    customerId: null,
  };

  if (role === "ADMIN") data.adminId = Number(dbId);
  if (role === "EMPLOYEE") data.employeeId = Number(dbId);
  if (role === "CUSTOMER") data.customerId = Number(dbId);

  // Fail-safe: audit log should NOT break the business action
  try {
    await prisma.auditLog.create({ data });
  } catch (err) {
    console.warn("AUDIT LOG FAILED:", err?.message || err);
  }
}

module.exports = { writeAuditLog };
