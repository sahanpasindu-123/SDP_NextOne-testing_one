// Temporary admin role check middleware
// In production, replace with proper role check from JWT

const adminStub = (req, res, next) => {
  // Check if user is authenticated and has admin role
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required"
    });
  }

  // Check if user has admin role
  if (req.user.role !== 'ADMIN' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: "Admin access required"
    });
  }

  // User is authenticated and has admin role
  next();
};

module.exports = adminStub;