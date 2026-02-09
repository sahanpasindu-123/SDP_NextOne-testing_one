const { Prisma } = require("@prisma/client");

// Global error handler middleware
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  // Default error
  let error = {
    success: false,
    message: err.message || 'Server Error',
    errors: []
  };

  // Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      error.message = 'Duplicate field value entered';
      error.errors = [{ field: err.meta?.target, message: 'This value is already in use' }];
    } else if (err.code === 'P2025') {
      error.message = 'Record not found';
    } else if (err.code === 'P2003') {
      error.message = 'Foreign key constraint violation';
    } else {
      error.message = 'Database error occurred';
    }
  }

  if (err instanceof Prisma.PrismaClientValidationError) {
    error.message = "Database validation error";
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error.message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    error.message = 'Token expired';
  }

  // Validation errors (from Zod)
  if (err.name === 'ZodError') {
    error.message = 'Validation failed';
    error.errors = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message
    }));
  }

  // Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error.message = 'File too large';
    // upload.js enforces 2MB
    error.errors = [{ field: 'file', message: 'File size cannot exceed 2MB' }];
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error.message = 'Unexpected file field';
    error.errors = [{ field: 'file', message: 'Invalid file upload' }];
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    error.message = 'Validation Error';
    error.errors = messages.map(msg => ({ message: msg }));
  }

  // CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    error.message = 'Resource not found';
    error.errors = [{ field: err.path, message: 'Invalid ID format' }];
  }

  // Honor thrown status patterns used across this codebase.
  // Default to 500 if no explicit status is provided.
  // If multer doesn't provide status, treat known upload errors as 400.
  const statusCode =
    err.statusCode ||
    err.status ||
    (err.code === "LIMIT_FILE_SIZE" || err.code === "LIMIT_UNEXPECTED_FILE" ? 400 : 500);

  res.status(statusCode).json(error);
};

module.exports = {
  errorHandler
};