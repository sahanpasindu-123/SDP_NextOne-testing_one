const express = require("express");
const router = express.Router();

const prisma = require("../utils/prisma");
const { authenticateToken, authorizeRoles } = require("../middleware/auth");

// helper: make "ENG-001"
function makePrefix(name) {
  const clean = name.trim().replace(/[^a-zA-Z0-9 ]/g, ""); // remove weird chars
  const words = clean.split(/\s+/).filter(Boolean);

  // Prefer first letters of up to 3 words: "Engine Parts" -> "EP" (then pad)
  // But you asked for ENG, so use first 3 letters of first word:
  const first = (words[0] || "CAT").toUpperCase();
  return first.substring(0, 3).padEnd(3, "X"); // if shorter than 3
}

async function generateCategoryCode(categoryName) {
  const prefix = makePrefix(categoryName);

  // Find the last code for this prefix, e.g. ENG-007
  const last = await prisma.category.findFirst({
    where: { CategoryCode: { startsWith: `${prefix}-` } },
    orderBy: { CategoryCode: "desc" },
    select: { CategoryCode: true },
  });

  let nextNumber = 1;

  if (last?.CategoryCode) {
    const parts = last.CategoryCode.split("-");
    const num = Number(parts[1]);
    if (Number.isFinite(num)) nextNumber = num + 1;
  }

  const code = `${prefix}-${String(nextNumber).padStart(3, "0")}`;
  return code;
}

// GET all categories
// Read permissions: ADMIN, EMPLOYEE, CUSTOMER
router.get(
  "/",
  authenticateToken,
  authorizeRoles("ADMIN", "EMPLOYEE", "CUSTOMER"),
  async (req, res) => {
    try {
      const categories = await prisma.category.findMany({
        orderBy: { Name: "asc" },
      });
      res.json({ success: true, data: categories });
    } catch (e) {
      console.error("GET /api/categories error:", e);
      res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// GET category by id
router.get(
  "/:id",
  authenticateToken,
  authorizeRoles("ADMIN", "EMPLOYEE", "CUSTOMER"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ success: false, message: "Invalid id" });
      }

      const category = await prisma.category.findUnique({
        where: { CategoryID: id },
      });

      if (!category) {
        return res.status(404).json({ success: false, message: "Category not found" });
      }

      return res.json({ success: true, data: category });
    } catch (e) {
      console.error("GET /api/categories/:id error:", e);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// CREATE category (ADMIN ONLY) - now generates CategoryCode like ENG-001
router.post("/", authenticateToken, authorizeRoles("ADMIN"), async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: "Category name is required" });
    }

    const code = await generateCategoryCode(name);

    const created = await prisma.category.create({
      data: {
        Name: name.trim(),
        CategoryCode: code,
      },
    });

    return res.status(201).json({ success: true, data: created });
  } catch (e) {
    console.error("POST /api/categories error:", e);

    // duplicate name or duplicate code
    return res.status(400).json({
      success: false,
      message: "Category already exists (or code conflict)",
    });
  }
});

// UPDATE category (ADMIN/EMPLOYEE only)
router.put(
  "/:id",
  authenticateToken,
  authorizeRoles("ADMIN", "EMPLOYEE"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { name } = req.body;

      if (!Number.isFinite(id)) {
        return res.status(400).json({ success: false, message: "Invalid id" });
      }
      if (!name || !name.trim()) {
        return res.status(400).json({ success: false, message: "Category name is required" });
      }

      const updated = await prisma.category.update({
        where: { CategoryID: id },
        data: { Name: name.trim() },
      });

      return res.json({ success: true, data: updated });
    } catch (e) {
      console.error("PUT /api/categories/:id error:", e);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// DELETE category (ADMIN/EMPLOYEE only)
router.delete(
  "/:id",
  authenticateToken,
  authorizeRoles("ADMIN", "EMPLOYEE"),
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ success: false, message: "Invalid id" });
      }

      // Optional: block delete if products exist
      const count = await prisma.product.count({ where: { CategoryID: id } });
      if (count > 0) {
        return res.status(400).json({
          success: false,
          message: "Cannot delete category: products exist in this category",
        });
      }

      await prisma.category.delete({ where: { CategoryID: id } });
      return res.json({ success: true, message: "Deleted" });
    } catch (e) {
      console.error("DELETE /api/categories/:id error:", e);
      return res.status(500).json({ success: false, message: "Server error" });
    }
  }
);

// NOTE: Write permissions are intentionally restricted (ADMIN/EMPLOYEE) by design.

module.exports = router;
