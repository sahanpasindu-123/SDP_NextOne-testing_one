/*
  Simple DB connectivity + row count check.
  Loads backend/.env so DATABASE_URL is available.
*/

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const prisma = require("../src/utils/prisma");

async function main() {
  const productCount = await prisma.product.count();
  const customerCount = await prisma.customer.count();
  const reservationCount = await prisma.reservation.count();

  console.log("DATABASE_URL:", process.env.DATABASE_URL);
  console.log("products:", productCount);
  console.log("customers:", customerCount);
  console.log("reservations:", reservationCount);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
