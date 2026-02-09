/**
 * Read-only DB Safety Verification
 *
 * NON-DESTRUCTIVE:
 * - Does NOT write, update, delete, truncate, or migrate.
 * - Only reads counts + small samples.
 *
 * Usage:
 *   cd backend
 *   node scripts/dbSafetyVerify.js > db-before.json
 *   # run your server / UI tests
 *   node scripts/dbSafetyVerify.js > db-after.json
 *   # compare files
 */
const prisma = require("../src/utils/prisma");

async function main() {
  const [
    products,
    categories,
    reservations,
    customers,
    employees,
    admins,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.category.count(),
    prisma.reservation.count(),
    prisma.customer.count(),
    prisma.employee.count(),
    prisma.admin.count(),
  ]);

  const [
    productSample,
    categorySample,
    reservationSample,
    customerSample,
  ] = await Promise.all([
    prisma.product.findMany({
      take: 3,
      orderBy: { ProductID: "asc" },
      select: { ProductID: true, Name: true, Stock: true, CategoryID: true },
    }),
    prisma.category.findMany({
      take: 3,
      orderBy: { CategoryID: "asc" },
      select: { CategoryID: true, CategoryCode: true, Name: true },
    }),
    prisma.reservation.findMany({
      take: 3,
      orderBy: { ReservationID: "asc" },
      select: { ReservationID: true, CustomerID: true, ProductID: true, Status: true, Total: true },
    }),
    prisma.customer.findMany({
      take: 3,
      orderBy: { CustomerID: "asc" },
      select: { CustomerID: true, Email: true, Name: true, emailVerified: true },
    }),
  ]);

  const out = {
    timestamp: new Date().toISOString(),
    counts: { products, categories, reservations, customers, employees, admins },
    samples: {
      products: productSample,
      categories: categorySample,
      reservations: reservationSample,
      customers: customerSample,
    },
  };

  process.stdout.write(JSON.stringify(out, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
