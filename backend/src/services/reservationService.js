const prisma = require("../utils/prisma");

function toInt(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

class ReservationError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// ===============================
// Expiry (business rule: 3 days)
// ===============================
const ACTIVE_STATUSES_FOR_EXPIRY = ["PENDING", "RESERVED", "CONFIRMED"];

function getReservationExpiryDays() {
  const raw = Number(process.env.RESERVATION_EXPIRY_DAYS ?? 3);
  return Number.isFinite(raw) && raw > 0 ? raw : 3;
}

function getReservationExpiryMs() {
  return getReservationExpiryDays() * 24 * 60 * 60 * 1000;
}

function computeExpiresAt(reservedAt) {
  const base = reservedAt instanceof Date ? reservedAt : new Date(reservedAt);
  return new Date(base.getTime() + getReservationExpiryMs());
}

function normStatus(s) {
  return String(s || "").trim().toUpperCase();
}

async function expireReservationIfNeededTx(tx, reservationId, now = new Date()) {
  const id = toInt(reservationId);
  if (!id) return { expired: false, notFound: true };

  const r = await tx.reservation.findUnique({
    where: { ReservationID: id },
    select: {
      ReservationID: true,
      CustomerID: true,
      ProductID: true,
      Quantity: true,
      Status: true,
      ReservedAt: true,
      ExpiresAt: true,
    },
  });

  if (!r) return { expired: false, notFound: true };

  const current = normStatus(r.Status);
  const effectiveExpiresAt = r.ExpiresAt ? new Date(r.ExpiresAt) : computeExpiresAt(r.ReservedAt);

  // Backfill ExpiresAt for historical rows that have it NULL.
  if (!r.ExpiresAt) {
    try {
      await tx.reservation.update({
        where: { ReservationID: id },
        data: { ExpiresAt: effectiveExpiresAt },
      });
    } catch {
      // ignore (best-effort backfill)
    }
  }

  // Not expired (or already final)
  if (!Number.isFinite(effectiveExpiresAt.getTime()) || now <= effectiveExpiresAt) {
    return { expired: false, reservation: r, expiresAt: effectiveExpiresAt };
  }

  if (!ACTIVE_STATUSES_FOR_EXPIRY.includes(current)) {
    return { expired: false, reservation: r, expiresAt: effectiveExpiresAt };
  }

  // Atomic guard: expire only once (prevents double stock increment).
  const lock = await tx.reservation.updateMany({
    where: { ReservationID: id, Status: { in: ACTIVE_STATUSES_FOR_EXPIRY } },
    data: { Status: "CANCELLED", ExpiresAt: effectiveExpiresAt },
  });

  if (lock.count === 1) {
    await tx.product.update({
      where: { ProductID: r.ProductID },
      data: { Stock: { increment: Number(r.Quantity || 0) } },
    });

    // Best-effort audit (do not block expiry enforcement if audit table is missing/misconfigured)
    try {
      await tx.auditLog.create({
        data: {
          actorRole: "SYSTEM",
          action: "RESERVATION_EXPIRE",
          entityType: "reservation",
          entityId: String(id),
          beforeData: JSON.stringify({ Status: current }),
          afterData: JSON.stringify({ Status: "CANCELLED" }),
          meta: JSON.stringify({ reason: "ExpiresAt", expiresAt: effectiveExpiresAt.toISOString() }),
          adminId: null,
          employeeId: null,
          customerId: r.CustomerID,
        },
      });
    } catch {
      // ignore
    }

    return { expired: true, cancelled: true, reservation: r, expiresAt: effectiveExpiresAt };
  }

  return { expired: true, cancelled: false, reservation: r, expiresAt: effectiveExpiresAt };
}

async function expireReservationsForCustomer(customerId, { now = new Date(), limit = 250 } = {}) {
  const cid = toInt(customerId);
  if (!cid) return { success: false, expiredCount: 0 };

  const expired = await prisma.$transaction(async (tx) => {
    const candidates = await tx.reservation.findMany({
      where: {
        CustomerID: cid,
        Status: { in: ACTIVE_STATUSES_FOR_EXPIRY },
        OR: [
          { ExpiresAt: { lte: now } },
          { ExpiresAt: null, ReservedAt: { lte: new Date(now.getTime() - getReservationExpiryMs()) } },
        ],
      },
      select: { ReservationID: true },
      take: Math.min(Math.max(Number(limit) || 1, 1), 1000),
    });

    let expiredCount = 0;
    for (const c of candidates) {
      const r = await expireReservationIfNeededTx(tx, c.ReservationID, now);
      if (r.expired && r.cancelled) expiredCount += 1;
    }

    return expiredCount;
  });

  return { success: true, expiredCount: expired };
}

async function processExpiredReservations({ now = new Date(), limit = 250 } = {}) {
  const expiredCount = await prisma.$transaction(async (tx) => {
    const candidates = await tx.reservation.findMany({
      where: {
        Status: { in: ACTIVE_STATUSES_FOR_EXPIRY },
        OR: [
          { ExpiresAt: { lte: now } },
          { ExpiresAt: null, ReservedAt: { lte: new Date(now.getTime() - getReservationExpiryMs()) } },
        ],
      },
      select: { ReservationID: true },
      orderBy: { ReservedAt: "asc" },
      take: Math.min(Math.max(Number(limit) || 1, 1), 2000),
    });

    let count = 0;
    for (const c of candidates) {
      const r = await expireReservationIfNeededTx(tx, c.ReservationID, now);
      if (r.expired && r.cancelled) count += 1;
    }

    return count;
  });

  return { success: true, expiredCount };
}

/**
 * Atomically validates stock, decrements inventory, and creates a reservation.
 *
 * Concurrency safety:
 * - Stock decrement is done with updateMany + Stock >= qty guard.
 * - Wrapped in a DB transaction: if reservation insert fails, stock is rolled back.
 */
async function createReservation({
  productId,
  quantity,
  customerId,
  notes = null,
  reservedAt = null,
}) {
  const pid = toInt(productId);
  const qty = toInt(quantity);
  const cid = toInt(customerId);

  if (!pid) throw new ReservationError("Invalid productId", 400);
  if (!cid) throw new ReservationError("Invalid customerId", 400);
  if (!qty || qty < 1) throw new ReservationError("Quantity must be greater than 0", 400);

  const LOW_STOCK_THRESHOLD = 5;
  const now = reservedAt ? new Date(reservedAt) : new Date();
  if (reservedAt && Number.isNaN(now.getTime())) {
    throw new ReservationError("Invalid reservedAt date", 400);
  }

  const result = await prisma.$transaction(async (tx) => {
    // 0) Validate customer exists
    const customer = await tx.customer.findUnique({
      where: { CustomerID: cid },
      select: { CustomerID: true },
    });
    if (!customer) throw new ReservationError("Customer not found", 400);

    // 1) Validate product exists (and get price + stock snapshot for audit)
    const product = await tx.product.findUnique({
      where: { ProductID: pid },
      select: { ProductID: true, Price: true, StockLimit: true, Stock: true, Name: true },
    });
    if (!product) throw new ReservationError("Product not found", 404);

    const beforeStock = Number(product.Stock ?? 0);

    // 2) Atomically decrement stock only if enough stock is available
    const dec = await tx.product.updateMany({
      where: { ProductID: pid, Stock: { gte: qty } },
      data: { Stock: { decrement: qty } },
    });

    if (dec.count === 0) {
      throw new ReservationError("Not enough stock available", 400);
    }

    // 3) Read back updated stock (within same transaction)
    const updatedProduct = await tx.product.findUnique({
      where: { ProductID: pid },
      select: { Stock: true, StockLimit: true, Name: true },
    });

    const availableStock = updatedProduct?.Stock ?? 0;

    // 4) Create reservation record
    const unitPrice = Number(product.Price || 0);
    const totalPrice = unitPrice * qty;

    const reservation = await tx.reservation.create({
      data: {
        CustomerID: cid,
        ProductID: pid,
        Quantity: qty,
        Notes: notes || null,
        UnitPrice: unitPrice,
        Total: totalPrice,
        Status: "PENDING",
        ReservedAt: now,
        ExpiresAt: computeExpiresAt(now),
      },
      select: { ReservationID: true },
    });

    // 4.1) AUDIT: inventory decrement due to reservation creation
    // (kept inside the same transaction so it matches the stock/reservation state)
    await tx.auditLog.create({
      data: {
        actorRole: "CUSTOMER",
        customerId: cid,
        action: "INVENTORY_DECREMENT_RESERVATION",
        entityType: "product",
        entityId: String(pid),
        beforeData: JSON.stringify({ Stock: beforeStock }),
        afterData: JSON.stringify({ Stock: availableStock }),
        meta: JSON.stringify({
          reservationFlow: "createReservation",
          reservationId: reservation.ReservationID,
          quantity: qty,
          productName: product.Name || updatedProduct?.Name || null,
        }),
      },
    });

    // 5) Low-stock handling
    // - Set StockLimit to 5 once if not set (so UI can show low stock consistently)
    if (updatedProduct?.StockLimit == null) {
      await tx.product.update({
        where: { ProductID: pid },
        data: { StockLimit: LOW_STOCK_THRESHOLD },
      });
    }

    // - Create a LOW_STOCK alert when remaining stock <= 5
    //   (simple dedupe: if there is already an active NEW LOW_STOCK alert for this product, skip)
    if (availableStock <= LOW_STOCK_THRESHOLD) {
      const existing = await tx.alert.findFirst({
        where: {
          IsActive: true,
          Type: "LOW_STOCK",
          // Status may be NEW/Unread/null/Read depending on older code paths
          OR: [{ Status: "NEW" }, { Status: "Unread" }, { Status: null }],
          Message: { contains: `ProductID ${pid}` },
        },
        select: { AlertID: true },
      });

      if (!existing) {
        await tx.alert.create({
          data: {
            Message: `Low stock for ProductID ${pid} (${updatedProduct?.Name || "Product"}). Available: ${availableStock}`,
            Type: "LOW_STOCK",
            Status: "NEW",
            IsActive: true,
          },
        });
      }
    }

    return {
      reservationId: reservation.ReservationID,
      availableStock,
    };
  });

  return result;
}

module.exports = {
  createReservation,
  ReservationError,
  computeExpiresAt,
  expireReservationIfNeededTx,
  expireReservationsForCustomer,
  processExpiredReservations,
};
