const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Optional: DB connection test (call this from index.js if you want)
async function testConnection() {
  try {
    await prisma.$connect();
    console.log("✅ Database connected successfully");
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    process.exit(1);
  }
}

// Graceful shutdown
async function shutdown() {
  try {
    await prisma.$disconnect();
  } finally {
    process.exit(0);
  }
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
// nodemon uses SIGUSR2 for restarts; disconnect so Prisma doesn't keep engine files locked.
process.on("SIGUSR2", async () => {
  try {
    await prisma.$disconnect();
  } finally {
    process.kill(process.pid, "SIGUSR2");
  }
});

// ✅ Export ONLY the PrismaClient instance
module.exports = prisma;

// If you ever need testConnection elsewhere, you can also do:
// module.exports.testConnection = testConnection;
module.exports.testConnection = testConnection;
