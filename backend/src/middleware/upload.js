const multer = require("multer");
const path = require("path");
const fs = require("fs");

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

// 📂 uploads/products directory
const uploadDir = path.join(__dirname, "..", "..", "uploads", "products");

// Create directory if not exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 🗂️ Storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, filename);
  },
});

// 🛡️ Image-only filter
const fileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    return cb(badRequest("Only image files are allowed"), false);
  }
  cb(null, true);
};

// 📤 Multer instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
  },
});

module.exports = upload;
