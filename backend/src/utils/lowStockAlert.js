function toInt(v) {
  const n = Number(v);
  return Number.isInteger(n) ? n : null;
}

function buildLowStockMessage({ productId, productName, stock, limit }) {
  const pid = toInt(productId);
  const s = Number(stock ?? 0);
  const l = Number(limit ?? 0);
  const name = String(productName || "Product").trim() || "Product";

  return `Low stock for ProductID ${pid} (${name}). Available: ${s} (Limit: ${l})`;
}

async function ensureLowStockAlert(db, { productId, productName, stock, limit }) {
  const pid = toInt(productId);
  if (pid === null) {
    return { created: false, reason: "INVALID_PRODUCT" };
  }

  if (limit === null || limit === undefined) {
    return { created: false, reason: "NO_LIMIT" };
  }

  const s = Number(stock ?? 0);
  const l = Number(limit ?? 0);

  if (!Number.isFinite(s) || !Number.isFinite(l)) {
    return { created: false, reason: "INVALID_STOCK" };
  }

  if (s > l) {
    return { created: false, reason: "ABOVE_LIMIT" };
  }

  const name = String(productName || "").trim();
  const productIdToken = `ProductID ${pid}`;

  const existing = await db.alert.findFirst({
    where: {
      IsActive: true,
      Type: "LOW_STOCK",
      OR: [
        { Message: { contains: productIdToken } },
        ...(name ? [{ Message: { contains: `(${name})` } }] : []),
      ],
    },
    select: { AlertID: true },
  });

  if (existing?.AlertID) {
    return { created: false, reason: "EXISTS", alertId: existing.AlertID };
  }

  const Message = buildLowStockMessage({
    productId: pid,
    productName: name,
    stock: s,
    limit: l,
  });

  const created = await db.alert.create({
    data: {
      Message,
      Type: "LOW_STOCK",
      Status: "Unread",
      IsActive: true,
    },
    select: { AlertID: true },
  });

  return { created: true, alertId: created?.AlertID };
}

module.exports = {
  ensureLowStockAlert,
  buildLowStockMessage,
};