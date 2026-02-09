const prisma = require("../utils/prisma");

// GET /api/categories
exports.getCategories = async (req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: { Name: "asc" },
  });
  res.json({ success: true, data: categories });
};

// POST /api/categories
exports.createCategory = async (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, message: "Category name is required" });
  }

  const created = await prisma.category.create({
    data: { Name: name.trim() },
  });

  res.status(201).json({ success: true, data: created });
};

// PUT /api/categories/:id
exports.updateCategory = async (req, res) => {
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

  res.json({ success: true, data: updated });
};

// DELETE /api/categories/:id
exports.deleteCategory = async (req, res) => {
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
  res.json({ success: true, message: "Deleted" });
};
