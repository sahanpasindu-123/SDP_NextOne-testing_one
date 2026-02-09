const express = require("express");
const router = express.Router();

// Middleware
const upload = require("../middleware/upload");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");

// Controller
const productController = require("../controllers/productController");

/* =========================================================
   READ OPERATIONS (Authenticated users)
   ========================================================= */

/**
 * GET /api/products
 * Optional query params:
 *  - categoryId
 *  - placeId
 *  - q (search keyword)
 */
router.get(
  "/",
  authenticateToken,
  productController.getProducts
);

/**
 * GET /api/products/categories
 * Get all product categories
 */
router.get(
  "/categories",
  authenticateToken,
  productController.getCategories
);

router.get("/:id", authenticateToken, productController.getProductById);


/* =========================================================
   WRITE OPERATIONS (ADMIN only)
   ========================================================= */

// Custom authz for create: provide stricter business message
function requireAdminForCreate(req, res, next) {
  const role = String(req.user?.role || "").toUpperCase();
  if (role !== "ADMIN") {
    return res.status(403).json({ success: false, message: "Admin approval required" });
  }
  return next();
}

/**
 * POST /api/products
 * Create new product
 * Content-Type: multipart/form-data
 * Fields:
 *  - name (required)
 *  - description (optional)
 *  - price (required)
 *  - stock (required)
 *  - stockLimit (optional)
 *  - categoryId (required)
 *  - placeId (optional)
 *  - image (file)
 */
router.post(
  "/",
  authenticateToken,
  requireAdminForCreate,
  upload.single("image"),
  productController.createProduct
);

/**
 * PUT /api/products/:id
 * Update product details (JSON)
 */
router.put(
  "/:id",
  authenticateToken,
  authorizeRoles("ADMIN"),
  productController.updateProduct
);

/**
 * DELETE /api/products/:id
 * Delete product
 */
router.delete(
  "/:id",
  authenticateToken,
  authorizeRoles("ADMIN"),
  productController.deleteProduct
);

/**
 * POST /api/products/:id/image
 * Update product image
 * Content-Type: multipart/form-data
 */
router.post(
  "/:id/image",
  authenticateToken,
  authorizeRoles("ADMIN"),
  upload.single("image"),
  productController.updateProductImage
);

module.exports = router;
