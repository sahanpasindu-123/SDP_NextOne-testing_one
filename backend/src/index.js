/**
 * ================================
 * Core imports
 * ================================
 */
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");
require("./config/env");

/**
 * ================================
 * Internal imports
 * ================================
 */
const prisma = require("./utils/prisma");
const { errorHandler } = require("./middleware/errorHandler");
const { authenticateToken, authorizeRoles } = require("./middleware/auth");
const { processExpiredReservations } = require("./services/reservationService");

/**
 * ================================
 * Safe route loader
 * (Prevents crash if a route file is missing)
 *
 * FIX: If a route module is ESM-like or exports { default: router },
 * unwrap it and return the actual router function.
 * ================================
 */
function safeRequire(routePath) {
  try {
    const mod = require(routePath);

    // ✅ Unwrap default export (common when mixing ESM-style exports or transpiled modules)
    if (mod && typeof mod === "object" && mod.default) return mod.default;

    return mod;
  } catch (err) {
    if (err.code === "MODULE_NOT_FOUND") {
      console.warn(`⚠️ Route not found: ${routePath} (skipped)`);
      return null;
    }
    throw err;
  }
}

/**
 * ================================
 * Load routes (SAFE)
 * ================================
 */
const authRoutes = safeRequire("./routes/auth");
const productRoutes = safeRequire("./routes/products");
const saleRoutes = safeRequire("./routes/sales");
const reservationRoutes = safeRequire("./routes/reservations");
const customerRoutes = safeRequire("./routes/customers");
const alertRoutes = safeRequire("./routes/alerts");
const reportRoutes = safeRequire("./routes/reports");
const settingRoutes = safeRequire("./routes/settings");

// ✅ contact routes
const contactRoutes = safeRequire("./routes/contacts");
const adminContactRoutes = safeRequire("./routes/adminContacts");

const employeeRoutes = safeRequire("./routes/employees");
const employeeReservationRoutes = safeRequire("./routes/employeeReservations");

const adminRoutes = safeRequire("./routes/admin");
const adminUsersRoutes = safeRequire("./routes/adminUsers");

const categoryRoutes = safeRequire("./routes/categories");
const productRequestRoutes = safeRequire("./routes/productRequests");

const placesRoutes = safeRequire("./routes/places");
const employeePlacesRoutes = safeRequire("./routes/employeePlaces");
const employeeMeRoutes = safeRequire("./routes/employeeMe");
const customerPortalRoutes = safeRequire("./routes/customer");

/**
 * ================================
 * App init
 * ================================
 */
const app = express();
const PORT = process.env.PORT || 5000;

/**
 * ================================
 * CORS (MUST be before routes)
 * ================================
 */
// Parse CORS_ORIGIN environment variable to handle multiple origins
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:5173";
const allowedOrigins = corsOrigin.split(',').map(origin => origin.trim());

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

/**
 * ================================
 * Security middleware
 * ================================
 */
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }, // 🔥 IMPORTANT
    contentSecurityPolicy: false,
  })
);

/**
 * ================================
 * Rate limiting
 * ================================
 */
const isProd = process.env.NODE_ENV === "production";

// General API limiter
const generalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isProd ? 90 : 250,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

// Auth limiter
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 15 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many requests. Please try again later.",
  },
});

// IMPORTANT: mount auth limiter before general /api limiter
app.use("/api/auth", authLimiter);
app.use("/api", generalApiLimiter);

/**
 * ================================
 * Body parsers
 * ================================
 */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/**
 * ================================
 * Logger
 * ================================
 */
app.use(morgan("dev"));

/**
 * ================================
 * Static files (uploads)
 * ================================
 */
// Add CORS headers for static file serving
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));

/**
 * ================================
 * Health check
 * ================================
 */
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
    cors_origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  });
});

/**
 * ================================
 * Database ping
 * ================================
 */
app.get("/api/db-ping", async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ success: true, message: "Database connected" });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

/**
 * ================================
 * Mount routes
 * ================================
 */
if (authRoutes) app.use("/api/auth", authRoutes);
if (productRoutes) app.use("/api/products", productRoutes);
if (saleRoutes) app.use("/api/sales", saleRoutes);
if (reservationRoutes) app.use("/api/reservations", reservationRoutes);
if (customerRoutes) app.use("/api/customers", customerRoutes);
if (alertRoutes) app.use("/api/alerts", alertRoutes);
if (reportRoutes) app.use("/api/reports", reportRoutes);
if (settingRoutes) app.use("/api/settings", settingRoutes);

// ✅ Customer contact (customer-side)
if (contactRoutes) app.use("/api/contacts", contactRoutes);

// Employees
if (employeeRoutes) app.use("/api/employees", employeeRoutes);
if (employeeReservationRoutes)
  app.use("/api/employee-reservations", employeeReservationRoutes);

// Admin
// RBAC hardening: everything under /api/admin requires ADMIN
if (adminRoutes)
  app.use("/api/admin", authenticateToken, authorizeRoles("ADMIN"), adminRoutes);
if (adminUsersRoutes)
  app.use(
    "/api/admin",
    authenticateToken,
    authorizeRoles("ADMIN"),
    adminUsersRoutes
  );

// ✅ Admin contact inbox + reply (admin-side)
if (adminContactRoutes)
  app.use(
    "/api/admin/contacts",
    authenticateToken,
    authorizeRoles("ADMIN"),
    adminContactRoutes
  );

// Categories & requests
if (categoryRoutes) app.use("/api/categories", categoryRoutes);
if (productRequestRoutes)
  app.use("/api/product-requests", productRequestRoutes);

// Places
if (placesRoutes) app.use("/api/places", placesRoutes);
if (employeePlacesRoutes)
  app.use("/api/employee-places", employeePlacesRoutes);
// RBAC hardening: everything under /api/employee requires EMPLOYEE or ADMIN
if (employeeMeRoutes)
  app.use(
    "/api/employee",
    authenticateToken,
    authorizeRoles("EMPLOYEE", "ADMIN"),
    employeeMeRoutes
  );

// Customer portal (strict prefix): everything under /api/customer requires CUSTOMER
if (customerPortalRoutes) app.use("/api/customer", customerPortalRoutes);

/**
 * ================================
 * 404 handler
 * ================================
 */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

/**
 * ================================
 * Global error handler
 * ================================
 */
app.use(errorHandler);

/**
 * ================================
 * Start server
 * ================================
 */
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`❤️  Health: http://localhost:${PORT}/api/health`);
  console.log(`🗄  DB Ping: http://localhost:${PORT}/api/db-ping`);

  console.log(
    "CORS_ORIGIN:",
    process.env.CORS_ORIGIN || "http://localhost:5173"
  );
  console.log(
    "JWT secret loaded:",
    !!(process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET)
  );
  console.log("DATABASE_URL loaded:", !!process.env.DATABASE_URL);

  // ===============================
  // Reservation expiry enforcement
  // ===============================
  const pollMsRaw = Number(process.env.RESERVATION_EXPIRY_POLL_MS);
  const pollMs =
    Number.isFinite(pollMsRaw) && pollMsRaw >= 10_000 ? pollMsRaw : 5 * 60 * 1000;

  let inFlight = false;
  const runExpiry = async () => {
    if (inFlight) return;
    inFlight = true;
    try {
      const r = await processExpiredReservations({ limit: 500 });
      if (r?.expiredCount) {
        console.log(`[expiry] cancelled expired reservations: ${r.expiredCount}`);
      }
    } catch (e) {
      console.warn("[expiry] failed:", e?.message || e);
    } finally {
      inFlight = false;
    }
  };

  runExpiry();
  setInterval(runExpiry, pollMs);
});

module.exports = app;
