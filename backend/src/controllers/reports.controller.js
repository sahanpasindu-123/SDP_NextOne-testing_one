const prisma = require("../utils/prisma");

const toISODate = (d) => {
  if (!d) return null;
  try {
    return new Date(d).toISOString().split("T")[0];
  } catch {
    return null;
  }
};

const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// ------------------------------------
// Dashboard stats
// ------------------------------------
const getDashboardStats = async (req, res) => {
  try {
    const [
      totalCustomers,
      totalProducts,
      totalSales,
      totalReservations,
      lowStockProducts,
      recentSales,
    ] = await Promise.all([
      prisma.customer.count(),
      prisma.product.count(),
      prisma.sale.count(),
      prisma.reservation.count(),
      prisma.product.findMany({
        where: { Stock: { lt: 5 } },
        select: { ProductID: true, Name: true, Stock: true },
        orderBy: { Stock: "asc" },
      }),
      prisma.sale.findMany({
        take: 5,
        orderBy: { SaleDate: "desc" },
        include: { customer: true, invoice: true },
      }),
    ]);

    const formattedSales = recentSales.map((s) => ({
      id: s?.invoice?.InvoiceID ?? s.SaleID ?? `SALE-${s.SaleID ?? "N/A"}`,
      customer: s.customer?.Name || "Walk-in",
      total: toNumber(s?.invoice?.Amount ?? s?.TotalPrice),
      date: s.SaleDate ?? s?.invoice?.Date ?? null,
      status: s.Status || "UNKNOWN",
    }));

    return res.json({
      success: true,
      data: {
        counts: {
          customers: totalCustomers,
          products: totalProducts,
          sales: totalSales,
          reservations: totalReservations,
        },
        lowStockProducts: lowStockProducts.map((p) => ({
          id: p.ProductID,
          name: p.Name,
          stock: p.Stock,
        })),
        recentSales: formattedSales,
      },
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

// ------------------------------------
// Sales Report
// GET /api/reports/sales
// Optional query: from=YYYY-MM-DD&to=YYYY-MM-DD
// ------------------------------------
const getSalesReport = async (req, res) => {
  try {
    const { from, to } = req.query;

    const where = {};
    if (from || to) {
      where.SaleDate = {};
      if (from) where.SaleDate.gte = new Date(from);
      if (to) where.SaleDate.lte = new Date(to);
    }

    const sales = await prisma.sale.findMany({
      where,
      include: { customer: true, invoice: true },
      orderBy: { SaleDate: "desc" },
    });

    const rows = sales.map((s) => ({
      id: s?.invoice?.InvoiceID ?? s.SaleID ?? `SALE-${s.SaleID ?? "N/A"}`,
      customer: s.customer ? s.customer.Name : "Walk-in",
      date: toISODate(s?.invoice?.Date ?? s?.SaleDate),
      amount: `Rs ${Math.round(
        toNumber(s?.invoice?.Amount ?? s?.TotalPrice)
      ).toLocaleString()}`,
      status: s.Status || "UNKNOWN",
    }));

    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Sales report error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch sales report",
    });
  }
};

// ------------------------------------
// Inventory Report
// GET /api/reports/inventory
// ------------------------------------
const getInventoryReport = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      include: { category: true },
      orderBy: { ProductID: "asc" },
    });

    const totalItems = products.length;
    const lowStock = products.filter((p) => Number(p.Stock) < 5).length;

    const inventoryValue = products.reduce(
      (sum, p) => sum + Number(p.Price ?? 0) * Number(p.Stock ?? 0),
      0
    );

    const categoryMap = {};
    products.forEach((p) => {
      const cat = p.category?.Name || p.category?.name || "Others";
      categoryMap[cat] = (categoryMap[cat] || 0) + Number(p.Stock ?? 0);
    });

    const pieData = Object.entries(categoryMap).map(([key, value]) => ({
      key,
      name: `${key}`,
      value,
    }));

    return res.json({
      success: true,
      data: {
        stats: { totalItems, lowStock, inventoryValue },
        pieData,
        movements: [],
      },
    });
  } catch (error) {
    console.error("Inventory report error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch inventory report",
    });
  }
};

// ------------------------------------
// Performance Report
// GET /api/reports/performance
// ------------------------------------
const getPerformanceReport = async (req, res) => {
  try {
    const sales = await prisma.sale.findMany({
      select: { SaleDate: true, TotalPrice: true },
    });

    const reservations = await prisma.reservation.findMany({
      select: { ReservedAt: true, Status: true },
    });

    const monthlySales = {};
    sales.forEach((s) => {
      const d = new Date(s.SaleDate);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      monthlySales[key] = (monthlySales[key] || 0) + toNumber(s.TotalPrice);
    });

    const monthlyReservations = {};
    reservations.forEach((r) => {
      const d = new Date(r.ReservedAt);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      monthlyReservations[key] = (monthlyReservations[key] || 0) + 1;
    });

    return res.json({
      success: true,
      data: { sales: monthlySales, reservations: monthlyReservations },
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: err.message || "Server error" });
  }
};

module.exports = {
  getDashboardStats,
  getSalesReport,
  getInventoryReport,
  getPerformanceReport,
};
