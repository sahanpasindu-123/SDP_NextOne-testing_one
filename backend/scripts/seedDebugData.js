/*
  Seed minimal data for reservation debugging.

  Creates (if missing):
  - 1 Category
  - 1 Product (with stock)
  - 1 Customer (emailVerified=true)
  - 1 Admin (for admin reservations page)

  Usage:
    node backend/scripts/seedDebugData.js

  NOTE: Uses backend/.env DATABASE_URL.
*/

const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const bcrypt = require("bcryptjs");
const prisma = require("../src/utils/prisma");

async function main() {
  // 1) Category
  const categoryCode = "CAT001";
  let category = await prisma.category.findUnique({
    where: { CategoryCode: categoryCode },
  });

  if (!category) {
    category = await prisma.category.create({
      data: { CategoryCode: categoryCode, Name: "General" },
    });
    console.log("✅ Created category:", category);
  } else {
    console.log("ℹ️ Category exists:", category);
  }

  // 2) Product
  let product = await prisma.product.findFirst({ orderBy: { ProductID: "asc" } });
  if (!product) {
    product = await prisma.product.create({
      data: {
        Name: "Test Part",
        Description: "Seed product for reservation debug",
        Price: 1000,
        Stock: 10,
        StockLimit: 5,
        CategoryID: category.CategoryID,
        ImageURL: null,
      },
    });
    console.log("✅ Created product:", product);
  } else {
    console.log("ℹ️ Product exists:", {
      ProductID: product.ProductID,
      Name: product.Name,
      Stock: product.Stock,
      CategoryID: product.CategoryID,
    });
  }

  // 3) Customer
  const customerEmail = "test.customer@example.com";
  let customer = await prisma.customer.findUnique({
    where: { Email: customerEmail },
  });

  if (!customer) {
    const hash = await bcrypt.hash("Test@1234", 10);
    customer = await prisma.customer.create({
      data: {
        Name: "Test Customer",
        Email: customerEmail,
        Phone: "0700000000",
        PasswordHash: hash,
        isActive: true,
        emailVerified: true,
      },
    });
    console.log("✅ Created customer:", customer);
  } else {
    console.log("ℹ️ Customer exists:", {
      CustomerID: customer.CustomerID,
      Email: customer.Email,
      emailVerified: customer.emailVerified,
    });
  }

  // 4) Admin (optional for admin pages)
  const adminCode = "ADM001";
  let admin = await prisma.admin.findUnique({ where: { AdminID: adminCode } });
  if (!admin) {
    const hash = await bcrypt.hash("Admin@1234", 10);
    admin = await prisma.admin.create({
      data: {
        AdminID: adminCode,
        Name: "Admin",
        Password: hash,
        Role: "admin",
      },
    });
    console.log("✅ Created admin:", admin);
  } else {
    console.log("ℹ️ Admin exists:", { id: admin.id, AdminID: admin.AdminID });
  }
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
