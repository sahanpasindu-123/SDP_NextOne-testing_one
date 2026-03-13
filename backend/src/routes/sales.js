const express = require("express");
const router = express.Router();

const prisma = require("../utils/prisma");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");
const bcrypt = require("bcryptjs");
const { expireReservationIfNeededTx } = require("../services/reservationService");

const WALK_IN_CUSTOMER_EMAIL = "walkin.pos@system.invalid";
const WALK_IN_CUSTOMER_PHONE = "WALKIN000000000"; // 15 chars (fits @db.VarChar(15))

async function getOrCreateWalkInCustomerId(tx) {
  const existing = await tx.customer.findUnique({
    where: { Email: WALK_IN_CUSTOMER_EMAIL },
    select: { CustomerID: true },
  });
  if (existing?.CustomerID) return existing.CustomerID;

  const baseCreateData = {
    Name: "Walk-in",
    Email: WALK_IN_CUSTOMER_EMAIL,
    PasswordHash: bcrypt.hashSync(`walk-in-${Date.now()}`, 10),
    isActive: true,
  };

  try {
    const created = await tx.customer.create({
      data: {
        ...baseCreateData,
        Phone: WALK_IN_CUSTOMER_PHONE,
      },
      select: { CustomerID: true },
    });
    return created.CustomerID;
  } catch (err) {
    const again = await tx.customer.findUnique({
      where: { Email: WALK_IN_CUSTOMER_EMAIL },
      select: { CustomerID: true },
    });
    if (again?.CustomerID) return again.CustomerID;

    if (err?.code === "P2002" && Array.isArray(err?.meta?.target) && err.meta.target.includes("Phone")) {
      const suffix = String(Date.now()).replace(/\D/g, "").slice(-9).padStart(9, "0");
      const created = await tx.customer.create({
        data: { ...baseCreateData, Phone: `WALKIN${suffix}` },
        select: { CustomerID: true },
      });
      return created.CustomerID;
    }

    throw err;
  }
}

// ------------------------------------
// GET /api/sales (ADMIN/EMPLOYEE)
// Query: page, limit, type, customerId, employeeId, productId, from, to
// ------------------------------------
router.get(
  "/",
  authenticateToken,
  authorizeRoles("ADMIN", "EMPLOYEE"),
  async (req, res) => {
    try {
      const page = Number(req.query.page || 1);
      const limit = Number(req.query.limit || 20);
      const skip = (page - 1) * limit;

      const type = req.query.type ? String(req.query.type).trim().toUpperCase() : null;
      const customerId = req.query.customerId ? Number(req.query.customerId) : null;
      const employeeId = req.query.employeeId ? Number(req.query.employeeId) : null;
      const productId = req.query.productId ? Number(req.query.productId) : null;

      const from = req.query.from ? new Date(String(req.query.from)) : null;
      const to = req.query.to ? new Date(String(req.query.to)) : null;

      const where = {};
      if (type) where.Type = type;
      if (Number.isFinite(customerId)) where.CustomerID = customerId;
      if (Number.isFinite(employeeId)) where.EmployeeID = employeeId;
      if (Number.isFinite(productId)) where.ProductID = productId;

      if (from || to) {
        where.SaleDate = {};
        if (from && !Number.isNaN(from.getTime())) where.SaleDate.gte = from;
        if (to && !Number.isNaN(to.getTime())) where.SaleDate.lte = to;
      }

      const [total, sales] = await Promise.all([
        prisma.sale.count({ where }),
        prisma.sale.findMany({
          where,
          orderBy: { SaleDate: "desc" },
          skip: Number.isFinite(skip) && skip >= 0 ? skip : 0,
          take: Number.isFinite(limit) && limit > 0 ? limit : 20,
          include: {
            customer: { select: { CustomerID: true, Name: true, Phone: true, Email: true } },
            product: { select: { ProductID: true, Name: true, Price: true } },
            employee: { select: { id: true, name: true } },
            invoice: true,
          },
        }),
      ]);

      return res.json({
        success: true,
        data: sales,
        pagination: {
          total,
          page: Number.isFinite(page) && page > 0 ? page : 1,
          limit: Number.isFinite(limit) && limit > 0 ? limit : 20,
          totalPages: Math.ceil(total / (Number.isFinite(limit) && limit > 0 ? limit : 20)),
        },
      });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message || "Server error" });
    }
  }
);

// ------------------------------------
// POST /api/sales (EMPLOYEE)
// body: { CustomerID?, ProductID, Quantity, Type? }
// ------------------------------------
router.post(
  "/",
  authenticateToken,
  authorizeRoles("EMPLOYEE"),
  async (req, res) => {
    try {
      const customerRaw = req.body.CustomerID;
      const hasCustomerId =
        customerRaw !== undefined &&
        customerRaw !== null &&
        String(customerRaw).trim() !== "";
      const CustomerID = hasCustomerId ? Number(customerRaw) : null;
      const ProductID = Number(req.body.ProductID);
      const Quantity = Number(req.body.Quantity);
      const Type = req.body.Type ? String(req.body.Type).trim().toUpperCase() : "CASH";
      // IMPORTANT: Sale.EmployeeID references employees.id (numeric PK)
      const EmployeeID = Number(req.user.dbId);

      // ✅ EmployeeID sanity check (data integrity)
      if (!Number.isFinite(EmployeeID) || EmployeeID <= 0) {
        return res.status(401).json({ success: false, message: "Authentication required" });
      }

      if (!Number.isFinite(ProductID) || !Number.isFinite(Quantity) || Quantity <= 0) {
        return res.status(400).json({ success: false, message: "Invalid payload" });
      }
      if (hasCustomerId && (!Number.isFinite(CustomerID) || CustomerID <= 0)) {
        return res.status(400).json({ success: false, message: "Invalid payload" });
      }

      const created = await prisma.$transaction(async (tx) => {
        const resolvedCustomerId = hasCustomerId
          ? CustomerID
          : await getOrCreateWalkInCustomerId(tx);

        if (hasCustomerId) {
          // ✅ Validate customer exists (data integrity)
          const customer = await tx.customer.findUnique({
            where: { CustomerID: resolvedCustomerId },
            select: { CustomerID: true },
          });
          if (!customer) {
            const e = new Error("Customer not found");
            e.status = 404;
            throw e;
          }
        }

        const p = await tx.product.findUnique({ where: { ProductID } });
        if (!p) {
          const e = new Error("Product not found");
          e.status = 404;
          throw e;
        }
        if (p.Stock < Quantity) {
          const e = new Error("Insufficient stock");
          e.status = 400;
          throw e;
        }

        // decrement stock
        await tx.product.update({
          where: { ProductID },
          data: { Stock: { decrement: Quantity } },
        });

        // ✅ log stock change to inventory_updates (existing table)
        await tx.inventoryUpdate.create({
          data: {
            ProductID,
            Changes: -Quantity,
            Status: "SALE",
            SubmittedBy: EmployeeID,
            ApprovedBy: null,
          },
        });

        // create sale
        const sale = await tx.sale.create({
          data: {
            CustomerID: resolvedCustomerId,
            ProductID,
            EmployeeID,
            Quantity,
            TotalPrice: Number(p.Price) * Quantity,
            Type,
          },
        });

        return sale;
      });

      return res.status(201).json({ success: true, message: "Sale created", data: created });
    } catch (err) {
      return res.status(err.status || 500).json({ success: false, message: err.message || "Server error" });
    }
  }
);

// ------------------------------------
// POST /api/sales/from-reservation (EMPLOYEE)
// body: { reservationId, paymentMethod }
// Creates a Sale from an existing CONFIRMED reservation and marks it COMPLETED.
// NOTE: stock already reduced when reservation was created, so NO stock decrement here.
// ------------------------------------
router.post(
  "/from-reservation",
  authenticateToken,
  authorizeRoles("EMPLOYEE"),
  async (req, res) => {
    try {
      const reservationId = Number(req.body?.reservationId);
      const paymentMethod = req.body?.paymentMethod
        ? String(req.body.paymentMethod).trim().toUpperCase()
        : "CASH";

      if (!Number.isFinite(reservationId) || reservationId <= 0) {
        return res.status(400).json({ success: false, message: "Invalid reservationId" });
      }

      // IMPORTANT: Sale.EmployeeID references employees.id (numeric PK)
      const EmployeeID = Number(req.user.dbId);
      if (!Number.isFinite(EmployeeID) || EmployeeID <= 0) {
        return res.status(401).json({ success: false, message: "Authentication required" });
      }

      const result = await prisma.$transaction(async (tx) => {
        const r = await tx.reservation.findUnique({
          where: { ReservationID: reservationId },
          include: { product: { select: { ProductID: true, PlaceID: true } }, customer: true },
        });

        if (!r) {
          const e = new Error("Reservation not found");
          e.status = 404;
          throw e;
        }

        // employee must be assigned to the reservation's product place
        const placeId = r.product?.PlaceID;
        if (!Number.isFinite(Number(placeId))) {
          const e = new Error("Reservation has no valid place");
          e.status = 400;
          throw e;
        }

        const assigned = await tx.employeePlace.findFirst({
          where: { EmployeeID, PlaceID: Number(placeId) },
          select: { id: true },
        });
        if (!assigned) {
          const e = new Error("Not authorized for this reservation");
          e.status = 403;
          throw e;
        }

        // ✅ Atomic guard FIRST: only ONE request can flip CONFIRMED -> COMPLETED
        // Prevents double-sale creation for the same reservation (race condition safe).
        // Enforce expiry (3-day rule) AFTER authorization checks.
        // IMPORTANT: do not throw after expiry inside this tx (would rollback the stock restore).
        const exp = await expireReservationIfNeededTx(tx, reservationId);
        if (exp?.expired) {
          return { expired: true, reservationId };
        }

        const status = String(r.Status || "").toUpperCase();
        if (status !== "CONFIRMED") {
          const e = new Error("Reservation must be CONFIRMED before creating a sale");
          e.status = 400;
          throw e;
        }

        const lock = await tx.reservation.updateMany({
          where: { ReservationID: reservationId, Status: "CONFIRMED" },
          data: { Status: "COMPLETED" },
        });

        if (lock.count !== 1) {
          const e = new Error("Reservation already processed or not CONFIRMED");
          e.status = 400;
          throw e;
        }

        // Create sale AFTER locking reservation
        const sale = await tx.sale.create({
          data: {
            CustomerID: r.CustomerID,
            ProductID: r.ProductID,
            EmployeeID,
            Quantity: r.Quantity,
            TotalPrice: Number(r.Total || 0),
            Type: paymentMethod,
          },
        });

        return { expired: false, sale, reservationId };
      });

      if (result?.expired) {
        return res.status(400).json({ success: false, message: "Reservation has expired" });
      }

      return res.status(201).json({
        success: true,
        message: "Sale created from reservation",
        data: result,
      });
    } catch (err) {
      return res.status(err.status || 500).json({ success: false, message: err.message || "Server error" });
    }
  }
);

// ------------------------------------
// POST /api/sales/:id/invoice (ADMIN/EMPLOYEE)
// create invoice if not exists
// ------------------------------------
router.post(
  "/:id/invoice",
  authenticateToken,
  authorizeRoles("ADMIN", "EMPLOYEE"),
  async (req, res) => {
    try {
      const saleId = Number(req.params.id);
      if (!Number.isFinite(saleId))
        return res.status(400).json({ success: false, message: "Invalid sale id" });

      const result = await prisma.$transaction(async (tx) => {
        const sale = await tx.sale.findUnique({
          where: { SaleID: saleId },
          include: { invoice: true, customer: true, product: true },
        });
        if (!sale) {
          const e = new Error("Sale not found");
          e.status = 404;
          throw e;
        }

        if (sale.invoice) return sale.invoice;

        const inv = await tx.invoice.create({
          data: {
            SaleID: saleId,
            Amount: sale.TotalPrice,
          },
        });

        return inv;
      });

      return res.json({ success: true, message: "Invoice ready", data: result });
    } catch (err) {
      return res.status(err.status || 500).json({ success: false, message: err.message || "Server error" });
    }
  }
);

module.exports = router;
