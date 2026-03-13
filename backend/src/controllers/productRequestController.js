const prisma = require("../utils/prisma");

function toNumberOrNull(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function isValidGeneratedProductCode(code) {
  return /^[A-Z]{3}-\d{3}$/.test(String(code || ""));
}

async function generateNextProductCodeTx(tx, prefix = "COO") {
  const pfx = String(prefix || "").trim().toUpperCase();
  const safePrefix = /^[A-Z]{3}$/.test(pfx) ? pfx : "COO";

  const existing = await tx.product.findMany({
    where: { ProductCode: { startsWith: `${safePrefix}-` } },
    select: { ProductCode: true },
  });

  let max = 0;
  for (const row of existing) {
    const code = String(row?.ProductCode || "").trim().toUpperCase();
    if (!code.startsWith(`${safePrefix}-`)) continue;
    if (!isValidGeneratedProductCode(code)) continue;
    const num = Number(code.slice(4));
    if (Number.isFinite(num)) max = Math.max(max, num);
  }

  const next = max + 1;
  if (next > 999) {
    const e = new Error("Unable to generate Product ID (code space exhausted)");
    e.status = 500;
    throw e;
  }

  return `${safePrefix}-${String(next).padStart(3, "0")}`;
}

// EMPLOYEE: create pending request
exports.createProductRequest = async (req, res) => {
  try {
    if (!prisma.productRequest) {
      return res.status(501).json({
        success: false,
        message: "Product requests not enabled: ProductRequest model/table missing",
      });
    }
    const { productName, categoryId, price, stockQty, minQty, desc, placeId } = req.body;

    if (!productName || !categoryId || price == null || stockQty == null) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const CategoryID = Number(categoryId);
    const Price = Number(price);
    const Stock = Number(stockQty);
    const StockLimit = minQty === "" || minQty == null ? null : Number(minQty);

    if (!Number.isFinite(CategoryID) || !Number.isFinite(Price) || !Number.isFinite(Stock)) {
      return res.status(400).json({ success: false, message: "Invalid numbers" });
    }
    if (StockLimit !== null && !Number.isFinite(StockLimit)) {
      return res.status(400).json({ success: false, message: "Invalid minQty" });
    }

    // ensure category exists
    const cat = await prisma.category.findUnique({ where: { CategoryID } });
    if (!cat) return res.status(400).json({ success: false, message: "Category not found" });

    // Resolve PlaceID (optional)
    let PlaceID = null;
    const placeNum = toNumberOrNull(placeId);
    if (placeNum !== null) {
      const place = await prisma.place.findUnique({ where: { PlaceID: placeNum } });
      if (!place) return res.status(400).json({ success: false, message: "Place not found" });
      if (place.IsActive === false)
        return res.status(400).json({ success: false, message: "Place is inactive" });
      PlaceID = placeNum;
    }

    // req.user.dbId is the numeric PK (Employee.id)
    const employeeDbId = Number(req.user.dbId);
    if (!Number.isFinite(employeeDbId)) {
      return res.status(401).json({ success: false, message: "Invalid employee token" });
    }

    const imagePath = req.file ? `/uploads/products/${req.file.filename}` : null;

    const created = await prisma.productRequest.create({
      data: {
        Name: productName,
        Description: desc || null,
        Price,
        Stock,
        StockLimit,
        CategoryID,
        PlaceID,
        ImageURL: imagePath,
        RequestedBy: employeeDbId,
      },
      include: { category: true, employee: true },
    });

    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    console.error("createProductRequest error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ADMIN: list requests (default pending)
exports.listRequests = async (req, res) => {
  try {
    if (!prisma.productRequest) {
      return res.status(501).json({
        success: false,
        message: "Product requests not enabled: ProductRequest model/table missing",
      });
    }
    const status = (req.query.status || "PENDING").toUpperCase();
    const allowed = new Set(["PENDING", "APPROVED", "REJECTED"]);
    if (!allowed.has(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }
    const data = await prisma.productRequest.findMany({
      where: { Status: status },
      include: { category: true, employee: true, admin: true },
      orderBy: { CreatedAt: "desc" },
    });
    res.json({ success: true, data });
  } catch (err) {
    console.error("listRequests error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ADMIN: approve request -> create Product + mark approved
exports.approveRequest = async (req, res) => {
  try {
    if (!prisma.productRequest) {
      return res.status(501).json({
        success: false,
        message: "Product requests not enabled: ProductRequest model/table missing",
      });
    }
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ success: false, message: "Invalid id" });

    // req.user.dbId is the numeric PK (Admin.id)
    const adminDbId = Number(req.user.dbId);
    if (!Number.isFinite(adminDbId)) {
      return res.status(401).json({ success: false, message: "Invalid admin token" });
    }

    const reqItem = await prisma.productRequest.findUnique({ where: { RequestID: id } });
    if (!reqItem) return res.status(404).json({ success: false, message: "Request not found" });
    if (reqItem.Status !== "PENDING") {
      return res.status(400).json({ success: false, message: "Request is not pending" });
    }

    const result = await prisma.$transaction(async (tx) => {
      // Ensure approved products always get a usable ProductCode (required by existing UIs/search).
      // Employee requests do not persist a productCode in the request model.
      let productCode = await generateNextProductCodeTx(tx, "COO");

      let product;
      for (let attempt = 0; attempt < 5; attempt += 1) {
        try {
          product = await tx.product.create({
            data: {
              ProductCode: productCode,
              Name: reqItem.Name,
              Description: reqItem.Description,
              Status: "ACTIVE",
              Price: reqItem.Price,
              Stock: reqItem.Stock,
              StockLimit: reqItem.StockLimit,
              CategoryID: reqItem.CategoryID,
              PlaceID: reqItem.PlaceID,
              ImageURL: reqItem.ImageURL,
            },
          });
          break;
        } catch (e) {
          // Prisma unique violation: retry with next code
          if (e?.code === "P2002") {
            productCode = await generateNextProductCodeTx(tx, "COO");
            continue;
          }
          throw e;
        }
      }

      if (!product) {
        const e = new Error("Failed to approve request (could not generate Product ID)");
        e.status = 500;
        throw e;
      }

      const updatedReq = await tx.productRequest.update({
        where: { RequestID: id },
        data: {
          Status: "APPROVED",
          ReviewedBy: adminDbId,
          ReviewedAt: new Date(),
        },
      });

      return { product, updatedReq };
    });

    res.json({ success: true, data: result });
  } catch (err) {
    console.error("approveRequest error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// ADMIN: reject request
exports.rejectRequest = async (req, res) => {
  try {
    if (!prisma.productRequest) {
      return res.status(501).json({
        success: false,
        message: "Product requests not enabled: ProductRequest model/table missing",
      });
    }
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ success: false, message: "Invalid id" });

    // req.user.dbId is the numeric PK (Admin.id)
    const adminDbId = Number(req.user.dbId);

    const updated = await prisma.productRequest.update({
      where: { RequestID: id },
      data: {
        Status: "REJECTED",
        ReviewedBy: adminDbId,
        ReviewedAt: new Date(),
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error("rejectRequest error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
