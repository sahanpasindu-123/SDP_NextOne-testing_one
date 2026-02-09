const prisma = require("../utils/prisma");
const { writeAuditLog } = require("../utils/auditLog");

// --------------------
// Helpers
// --------------------
function toNumberOrNull(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/**
 * Create LOW_STOCK alert when product stock is at/below stock limit.
 * Uses Prisma Alert model fields exactly as in schema.prisma:
 *  - Message, Type, Status, IsActive, CustomerID?, UserID?
 */
async function createLowStockAlertIfNeeded(product) {
  // StockLimit is optional in schema (Int?), so only trigger if it's set
  if (product.StockLimit === null || product.StockLimit === undefined) return;

  if (Number(product.Stock) <= Number(product.StockLimit)) {
    await prisma.alert.create({
      data: {
        Message: `Low stock for product: ${product.Name} (Stock: ${product.Stock}, Limit: ${product.StockLimit})`,
        Type: "LOW_STOCK",
        Status: "Unread",
        IsActive: true,
      },
    });
  }
}

// --------------------
// GET /api/products
// ?categoryId=1
// ?placeId=2
// ?q=search
// --------------------
exports.getProducts = async (req, res) => {
  try {
    const categoryId = toNumberOrNull(req.query.categoryId);
    const placeId = toNumberOrNull(req.query.placeId);
    const q = req.query.q ? String(req.query.q).trim() : null;

    const where = {};
    if (categoryId !== null) where.CategoryID = categoryId;
    if (placeId !== null) where.PlaceID = placeId;

    if (q) {
      where.OR = [
        { Name: { contains: q } },
        { Description: { contains: q } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        place: true,
      },
      orderBy: { CreatedAt: "desc" },
    });

    return res.json({
      success: true,
      data: products.map((p) => ({
        ProductID: p.ProductID,
        Name: p.Name,
        Description: p.Description,
        Price: p.Price,
        Stock: p.Stock,
        StockLimit: p.StockLimit,
        CategoryID: p.CategoryID,
        CategoryName: p.category?.Name ?? null,
        CategoryCode: p.category?.CategoryCode ?? null,
        PlaceID: p.PlaceID ?? null,
        PlaceName: p.place?.Name ?? null,
        ImageURL: p.ImageURL,
        CreatedAt: p.CreatedAt,
        UpdatedAt: p.UpdatedAt,
      })),
    });
  } catch (err) {
    console.error("getProducts error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// --------------------
// GET /api/products/:id
// --------------------
exports.getProductById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, message: "Invalid id" });
    }

    const p = await prisma.product.findUnique({
      where: { ProductID: id },
      include: { category: true, place: true },
    });

    if (!p) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    return res.json({
      success: true,
      data: {
        ProductID: p.ProductID,
        Name: p.Name,
        Description: p.Description,
        Price: p.Price,
        Stock: p.Stock,
        StockLimit: p.StockLimit,
        CategoryID: p.CategoryID,
        CategoryName: p.category?.Name ?? null,
        CategoryCode: p.category?.CategoryCode ?? null,
        PlaceID: p.PlaceID ?? null,
        PlaceName: p.place?.Name ?? null,
        ImageURL: p.ImageURL,
        CreatedAt: p.CreatedAt,
        UpdatedAt: p.UpdatedAt,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || "Server error" });
  }
};

// --------------------
// GET /api/products/categories
// --------------------
exports.getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      select: {
        CategoryID: true,
        Name: true,
        CategoryCode: true,
      },
      orderBy: { Name: "asc" },
    });

    return res.json({ success: true, data: categories });
  } catch (err) {
    console.error("getCategories error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// --------------------
// POST /api/products
// multipart/form-data
// --------------------
exports.createProduct = async (req, res) => {
  try {
    const {
      productName,
      categoryId,
      category,
      price,
      stockQty,
      minQty,
      desc,
      placeId,
    } = req.body;

    // ✅ Required fields
    if (
      !productName ||
      (!categoryId && !category) ||
      price === undefined ||
      stockQty === undefined ||
      minQty === undefined
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const Price = Number(price);
    const Stock = Number(stockQty);
    const StockLimit = Number(minQty);

    if (!Number.isFinite(Price) || Price < 0)
      return res.status(400).json({ success: false, message: "Invalid price" });

    if (!Number.isFinite(Stock) || Stock < 0)
      return res.status(400).json({ success: false, message: "Invalid stockQty" });

    if (!Number.isFinite(StockLimit) || StockLimit < 0)
      return res.status(400).json({ success: false, message: "Invalid minQty" });

    // --------------------
    // Resolve CategoryID
    // --------------------
    let CategoryID;

    if (categoryId) {
      CategoryID = Number(categoryId);
      if (!Number.isFinite(CategoryID))
        return res.status(400).json({ success: false, message: "Invalid categoryId" });

      const cat = await prisma.category.findUnique({
        where: { CategoryID },
      });
      if (!cat)
        return res.status(400).json({ success: false, message: "Category not found" });
    } else {
      const cat = await prisma.category.findFirst({
        where: { Name: String(category) },
      });
      if (!cat)
        return res.status(400).json({ success: false, message: "Category not found" });
      CategoryID = cat.CategoryID;
    }

    // --------------------
    // Resolve PlaceID (optional)
    // --------------------
    let PlaceID = null;
    if (placeId !== undefined && placeId !== "") {
      PlaceID = Number(placeId);
      if (!Number.isFinite(PlaceID))
        return res.status(400).json({ success: false, message: "Invalid placeId" });

      const place = await prisma.place.findUnique({
        where: { PlaceID },
      });
      if (!place)
        return res.status(400).json({ success: false, message: "Place not found" });
      if (place.IsActive === false)
        return res.status(400).json({ success: false, message: "Place is inactive" });
    }

    const imagePath = req.file
      ? `/uploads/products/${req.file.filename}`
      : null;

    const created = await prisma.product.create({
      data: {
        Name: String(productName).trim(),
        Description: desc ? String(desc) : null,
        Price,
        Stock,
        StockLimit,
        CategoryID,
        PlaceID,
        ImageURL: imagePath,
      },
      include: { category: true, place: true },
    });

    // ✅ ALERT: LOW_STOCK (only if StockLimit exists & Stock <= StockLimit)
    await createLowStockAlertIfNeeded(created);

    // --------------------
    // AUDIT: PRODUCT_CREATE
    // --------------------
    await writeAuditLog(req, {
      action: "PRODUCT_CREATE",
      entityType: "product",
      entityId: created.ProductID,
      before: null,
      after: {
        ProductID: created.ProductID,
        Name: created.Name,
        Price: created.Price,
        Stock: created.Stock,
        StockLimit: created.StockLimit,
        CategoryID: created.CategoryID,
        PlaceID: created.PlaceID,
        ImageURL: created.ImageURL,
      },
      meta: { inputKeys: Object.keys(req.body || {}) },
    });

    return res.status(201).json({
      success: true,
      message: "Product created",
      data: {
        ...created,
        CategoryName: created.category?.Name ?? null,
        PlaceName: created.place?.Name ?? null,
      },
    });
  } catch (err) {
    console.error("createProduct error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// --------------------
// PUT /api/products/:id
// --------------------
exports.updateProduct = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id))
      return res.status(400).json({ success: false, message: "Invalid id" });

    const {
      productName,
      categoryId,
      category,
      price,
      stockQty,
      minQty,
      desc,
      placeId,
    } = req.body;

    // --------------------
    // BEFORE snapshot (for audit + 404)
    // --------------------
    const before = await prisma.product.findUnique({
      where: { ProductID: id },
      select: {
        ProductID: true,
        Name: true,
        Description: true,
        Price: true,
        Stock: true,
        StockLimit: true,
        CategoryID: true,
        PlaceID: true,
        ImageURL: true,
      },
    });

    if (!before) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const data = {};

    if (productName !== undefined)
      data.Name = productName ? String(productName).trim() : null;

    if (desc !== undefined)
      data.Description = desc ? String(desc) : null;

    if (price !== undefined) {
      const Price = Number(price);
      if (!Number.isFinite(Price) || Price < 0)
        return res.status(400).json({ success: false, message: "Invalid price" });
      data.Price = Price;
    }

    if (stockQty !== undefined) {
      const Stock = Number(stockQty);
      if (!Number.isFinite(Stock) || Stock < 0)
        return res.status(400).json({ success: false, message: "Invalid stockQty" });
      data.Stock = Stock;
    }

    if (minQty !== undefined) {
      const StockLimit = Number(minQty);
      if (!Number.isFinite(StockLimit) || StockLimit < 0)
        return res.status(400).json({ success: false, message: "Invalid minQty" });
      data.StockLimit = StockLimit;
    }

    // Category
    if (categoryId || category) {
      let CategoryID;
      if (categoryId) {
        CategoryID = Number(categoryId);
        if (!Number.isFinite(CategoryID))
          return res.status(400).json({ success: false, message: "Invalid categoryId" });

        // optional: validate category exists
        const cat = await prisma.category.findUnique({ where: { CategoryID } });
        if (!cat)
          return res.status(400).json({ success: false, message: "Category not found" });
      } else {
        const cat = await prisma.category.findFirst({
          where: { Name: String(category) },
        });
        if (!cat)
          return res.status(400).json({ success: false, message: "Category not found" });
        CategoryID = cat.CategoryID;
      }
      data.CategoryID = CategoryID;
    }

    // Place
    if (placeId !== undefined) {
      if (placeId === null || placeId === "") {
        data.PlaceID = null;
      } else {
        const pid = Number(placeId);
        if (!Number.isFinite(pid))
          return res.status(400).json({ success: false, message: "Invalid placeId" });

        const place = await prisma.place.findUnique({
          where: { PlaceID: pid },
        });
        if (!place)
          return res.status(400).json({ success: false, message: "Place not found" });
        if (place.IsActive === false)
          return res.status(400).json({ success: false, message: "Place is inactive" });

        data.PlaceID = pid;
      }
    }

    const updated = await prisma.product.update({
      where: { ProductID: id },
      data,
      include: { category: true, place: true },
    });

    // ✅ ALERT: LOW_STOCK — only when crossing threshold (avoid spam)
    // Trigger if:
    //  - after has StockLimit set AND Stock <= StockLimit
    //  - and before was either above limit or had no limit
    const beforeHasLimit =
      before.StockLimit !== null && before.StockLimit !== undefined;
    const afterHasLimit =
      updated.StockLimit !== null && updated.StockLimit !== undefined;

    const beforeBelowOrEq =
      beforeHasLimit ? Number(before.Stock) <= Number(before.StockLimit) : false;

    const afterBelowOrEq =
      afterHasLimit ? Number(updated.Stock) <= Number(updated.StockLimit) : false;

    if (afterBelowOrEq && !beforeBelowOrEq) {
      await createLowStockAlertIfNeeded(updated);
    }

    // --------------------
    // AUDIT: PRODUCT_UPDATE (before/after)
    // --------------------
    await writeAuditLog(req, {
      action: "PRODUCT_UPDATE",
      entityType: "product",
      entityId: updated.ProductID,
      before,
      after: {
        ProductID: updated.ProductID,
        Name: updated.Name,
        Description: updated.Description,
        Price: updated.Price,
        Stock: updated.Stock,
        StockLimit: updated.StockLimit,
        CategoryID: updated.CategoryID,
        PlaceID: updated.PlaceID,
        ImageURL: updated.ImageURL,
      },
      meta: { inputKeys: Object.keys(req.body || {}) },
    });

    return res.json({
      success: true,
      message: "Product updated",
      data: {
        ...updated,
        CategoryName: updated.category?.Name ?? null,
        PlaceName: updated.place?.Name ?? null,
      },
    });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    console.error("updateProduct error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// --------------------
// DELETE /api/products/:id
// --------------------
exports.deleteProduct = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id))
      return res.status(400).json({ success: false, message: "Invalid id" });

    // --------------------
    // BEFORE snapshot (for audit + 404)
    // --------------------
    const before = await prisma.product.findUnique({
      where: { ProductID: id },
      select: {
        ProductID: true,
        Name: true,
        Price: true,
        Stock: true,
        StockLimit: true,
        CategoryID: true,
        PlaceID: true,
        ImageURL: true,
      },
    });

    if (!before) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    await prisma.product.delete({
      where: { ProductID: id },
    });

    // --------------------
    // AUDIT: PRODUCT_DELETE
    // --------------------
    await writeAuditLog(req, {
      action: "PRODUCT_DELETE",
      entityType: "product",
      entityId: before.ProductID,
      before,
      after: null,
      meta: { note: "product deleted" },
    });

    return res.json({ success: true, message: "Deleted" });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    console.error("deleteProduct error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

// --------------------
// POST /api/products/:id/image
// --------------------
exports.updateProductImage = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id))
      return res.status(400).json({ success: false, message: "Invalid id" });

    if (!req.file)
      return res.status(400).json({ success: false, message: "Image required" });

    // BEFORE snapshot
    const before = await prisma.product.findUnique({
      where: { ProductID: id },
      select: { ProductID: true, ImageURL: true, Name: true },
    });

    if (!before) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const imagePath = `/uploads/products/${req.file.filename}`;

    const updated = await prisma.product.update({
      where: { ProductID: id },
      data: { ImageURL: imagePath },
    });

    // AUDIT: PRODUCT_IMAGE_UPDATE
    await writeAuditLog(req, {
      action: "PRODUCT_IMAGE_UPDATE",
      entityType: "product",
      entityId: updated.ProductID,
      before,
      after: { ProductID: updated.ProductID, ImageURL: updated.ImageURL },
      meta: { note: "image changed" },
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    if (err.code === "P2025") {
      return res.status(404).json({ success: false, message: "Product not found" });
    }
    console.error("updateProductImage error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};
