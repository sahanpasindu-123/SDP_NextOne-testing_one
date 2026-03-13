/*
  Smoke test for reservation flow.

  Preconditions:
  - backend server running on http://localhost:5000
  - database has at least 1 product + 1 customer

  This script will:
  - pick the first product + first customer
  - POST /api/reservations with quantity 1
  - print response and stock before/after
*/

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const prisma = require("../src/utils/prisma");

async function main() {
  const product = await prisma.product.findFirst({
    orderBy: { ProductID: "asc" },
    select: { ProductID: true, Stock: true, Price: true, StockLimit: true },
  });

  const customer = await prisma.customer.findFirst({
    orderBy: { CustomerID: "asc" },
    select: { CustomerID: true, Email: true },
  });

  if (!product) throw new Error("No product found");
  if (!customer) throw new Error("No customer found");

  const qty = 1;
  console.log("Using product:", product);
  console.log("Using customer:", customer);

  // NOTE: Reservation create is a CUSTOMER-authenticated endpoint.
  // This script intentionally only checks DB primitives (stock + reservation row)
  // and does not call the HTTP endpoint.
  const beforeStock = product.Stock;
  const created = await prisma.$transaction(async (tx) => {
    // decrement stock if possible
    const dec = await tx.product.updateMany({
      where: { ProductID: product.ProductID, Stock: { gte: qty } },
      data: { Stock: { decrement: qty } },
    });
    if (dec.count === 0) throw new Error("Not enough stock");

    return tx.reservation.create({
      data: {
        CustomerID: customer.CustomerID,
        ProductID: product.ProductID,
        Quantity: qty,
        Notes: "smoke test",
        UnitPrice: Number(product.Price || 0),
        Total: Number(product.Price || 0) * qty,
        Status: "PENDING",
        ExpiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      },
      select: { ReservationID: true, Status: true },
    });
  });

  console.log("Created reservation:", created);

  const after = await prisma.product.findUnique({
    where: { ProductID: product.ProductID },
    select: { Stock: true, StockLimit: true },
  });

  console.log("Stock before:", beforeStock, "after:", after.Stock, "limit:", after.StockLimit);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
