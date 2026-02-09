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
        ExpiresAt: new Date(now.getTime() + 30 * 60 * 1000),
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
};
