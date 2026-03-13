const fs = require("fs");
const path = require("path");
const prisma = require("../utils/prisma");

const BACKUP_DIR = path.join(__dirname, "..", "..", "uploads", "backups");

// Ensure backup folder exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

/**
 * CREATE BACKUP
 * POST /api/settings/backup
 */
exports.createBackup = async (req, res) => {
  try {
    const fileName = `backup-${Date.now()}.json`;
    const filePath = path.join(BACKUP_DIR, fileName);

    // Keep this aligned with prisma schema (prisma/schema.prisma)
    const data = {
      meta: {
        createdAt: new Date().toISOString(),
        version: 1,
      },

      // Core actors
      admins: await prisma.admin.findMany(),
      employees: await prisma.employee.findMany(),
      customers: await prisma.customer.findMany(),

      // Catalog + workflow
      categories: await prisma.category.findMany(),
      places: await prisma.place.findMany(),
      products: await prisma.product.findMany(),
      employeePlaces: await prisma.employeePlace.findMany(),
      productRequests: await prisma.productRequest.findMany(),

      // Ops
      inventoryUpdates: await prisma.inventoryUpdate.findMany(),
      reservations: await prisma.reservation.findMany(),
      sales: await prisma.sale.findMany(),
      invoices: await prisma.invoice.findMany(),

      // Communication + logs
      contacts: await prisma.contact.findMany(),
      alerts: await prisma.alert.findMany(),
      reports: await prisma.report.findMany(),
      settings: await prisma.setting.findMany(),
      auditLogs: await prisma.auditLog.findMany(),
    };

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");

    res.json({ success: true, fileName });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * LIST BACKUPS
 * GET /api/settings/backup
 */
exports.listBackups = async (req, res) => {
  try {
    if (!fs.existsSync(BACKUP_DIR)) {
      return res.json({ success: true, data: [] });
    }

    const files = fs
      .readdirSync(BACKUP_DIR)
      .filter((f) => f.toLowerCase().endsWith(".json"))
      .sort()
      .reverse()
      .map((name) => ({ name }));

    res.json({ success: true, data: files });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * DOWNLOAD BACKUP (ADMIN ONLY)
 * GET /api/settings/backup/:fileName/download
 */
exports.downloadBackup = async (req, res) => {
  try {
    const fileNameRaw = String(req.params?.fileName || "").trim();
    if (!fileNameRaw) {
      return res.status(400).json({ success: false, message: "fileName required" });
    }

    // Prevent path traversal and limit to json backup files.
    if (
      fileNameRaw.includes("..") ||
      fileNameRaw.includes("/") ||
      fileNameRaw.includes("\\") ||
      !fileNameRaw.toLowerCase().endsWith(".json")
    ) {
      return res.status(400).json({ success: false, message: "Invalid fileName" });
    }

    const resolvedDir = path.resolve(BACKUP_DIR);
    const resolvedFile = path.resolve(path.join(BACKUP_DIR, fileNameRaw));

    if (!resolvedFile.startsWith(resolvedDir + path.sep)) {
      return res.status(400).json({ success: false, message: "Invalid fileName" });
    }

    if (!fs.existsSync(resolvedFile)) {
      return res.status(404).json({ success: false, message: "Backup file not found" });
    }

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");

    return res.download(resolvedFile, fileNameRaw);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * RESTORE BACKUP
 * POST /api/settings/backup/restore
 */
exports.restoreBackup = async (req, res) => {
  try {
    const { fileName } = req.body;

    if (!fileName) {
      return res.status(400).json({ success: false, message: "fileName required" });
    }

    const filePath = path.join(BACKUP_DIR, fileName);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: "Backup file not found" });
    }

    const backupData = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    // Basic guard
    if (!backupData || typeof backupData !== "object") {
      return res.status(400).json({ success: false, message: "Invalid backup format" });
    }

    await prisma.$transaction(async (tx) => {
      // =========================
      // DELETE (children -> parents)
      // =========================
      await tx.auditLog.deleteMany();
      await tx.contact.deleteMany();
      await tx.invoice.deleteMany();
      await tx.sale.deleteMany();
      await tx.reservation.deleteMany();
      await tx.inventoryUpdate.deleteMany();
      await tx.productRequest.deleteMany();
      await tx.employeePlace.deleteMany();
      await tx.product.deleteMany();
      await tx.category.deleteMany();
      await tx.customer.deleteMany();
      await tx.employee.deleteMany();
      await tx.admin.deleteMany();
      await tx.place.deleteMany();

      await tx.alert.deleteMany();
      await tx.report.deleteMany();
      await tx.setting.deleteMany();

      // =========================
      // INSERT (parents -> children)
      // =========================
      if (backupData.places?.length) await tx.place.createMany({ data: backupData.places });
      if (backupData.admins?.length) await tx.admin.createMany({ data: backupData.admins });
      if (backupData.employees?.length) await tx.employee.createMany({ data: backupData.employees });
      if (backupData.customers?.length) await tx.customer.createMany({ data: backupData.customers });

      if (backupData.categories?.length) await tx.category.createMany({ data: backupData.categories });
      if (backupData.products?.length) await tx.product.createMany({ data: backupData.products });

      if (backupData.employeePlaces?.length) await tx.employeePlace.createMany({ data: backupData.employeePlaces });
      if (backupData.productRequests?.length) await tx.productRequest.createMany({ data: backupData.productRequests });

      if (backupData.inventoryUpdates?.length) await tx.inventoryUpdate.createMany({ data: backupData.inventoryUpdates });
      if (backupData.reservations?.length) await tx.reservation.createMany({ data: backupData.reservations });
      if (backupData.sales?.length) await tx.sale.createMany({ data: backupData.sales });
      if (backupData.invoices?.length) await tx.invoice.createMany({ data: backupData.invoices });

      if (backupData.contacts?.length) await tx.contact.createMany({ data: backupData.contacts });

      if (backupData.alerts?.length) await tx.alert.createMany({ data: backupData.alerts });
      if (backupData.reports?.length) await tx.report.createMany({ data: backupData.reports });
      if (backupData.settings?.length) await tx.setting.createMany({ data: backupData.settings });

      if (backupData.auditLogs?.length) await tx.auditLog.createMany({ data: backupData.auditLogs });
    });

    res.json({ success: true, restored: fileName });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * EXPORT DATA
 * GET /api/settings/export/:type
 *
 * Supported:
 * - json (customers + products + sales)
 * - csv  (products only)
 */
exports.exportData = async (req, res) => {
  try {
    const { type } = req.params;

    const payload = {
      customers: await prisma.customer.findMany(),
      products: await prisma.product.findMany(),
      sales: await prisma.sale.findMany(),
    };

    // File name
    res.setHeader("Content-Disposition", `attachment; filename=data.${type}`);

    if (type === "json") {
      res.setHeader("Content-Type", "application/json");
      return res.send(JSON.stringify(payload, null, 2));
    }

    if (type === "csv") {
      const header = "ProductID,Name,Price,Stock\n";
      const rows = payload.products
        .map((p) => `${p.ProductID},"${String(p.Name).replace(/"/g, '""')}",${p.Price},${p.Stock}`)
        .join("\n");

      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      return res.send(header + rows + "\n");
    }

    // Keep placeholders as-is (no new features)
    if (type === "excel") return res.send("Excel export (placeholder)");
    if (type === "pdf") return res.send("PDF export (placeholder)");

    return res.status(400).send("Invalid export type");
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
