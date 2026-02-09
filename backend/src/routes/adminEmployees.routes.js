const express = require('express');
const router = express.Router();
const adminEmployeesController = require('../controllers/adminEmployees.controller');
const adminStub = require('../middleware/adminStub');
const { authenticateToken } = require('../middleware/auth');

// Admin-only routes for employee management
// All routes require authentication and admin role

/**
 * Create a new employee
 * POST /api/v1/admin/employees
 */
router.post('/employees',
  authenticateToken,
  adminStub,
  adminEmployeesController.createEmployee
);

/**
 * Get all employees
 * GET /api/v1/admin/employees
 */
router.get('/employees',
  authenticateToken,
  adminStub,
  adminEmployeesController.getAllEmployees
);

/**
 * Update an employee
 * PUT /api/v1/admin/employees/:id
 */
router.put('/employees/:id',
  authenticateToken,
  adminStub,
  adminEmployeesController.updateEmployee
);

/**
 * Disable an employee (soft delete)
 * DELETE /api/v1/admin/employees/:id
 */
router.delete('/employees/:id',
  authenticateToken,
  adminStub,
  adminEmployeesController.disableEmployee
);

module.exports = router;