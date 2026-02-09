const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { prisma } = require('../utils/prisma');
const { userSchema } = require('../utils/validators');

// Generate JWT token
const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

// Hash password
const hashPassword = async (password) => {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
};

// Compare password
const comparePassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

// Register customer
const registerCustomer = async (userData) => {
  // Validate input
  const validatedData = userSchema.register.parse(userData);

  // Check if email already exists
  const existingCustomer = await prisma.customer.findUnique({
    where: { email: validatedData.email }
  });

  if (existingCustomer) {
    throw new Error('Email already registered');
  }

  // Hash password
  const hashedPassword = await hashPassword(validatedData.password);

  // Create customer
  const customer = await prisma.customer.create({
    data: {
      firstName: validatedData.firstName,
      lastName: validatedData.lastName,
      email: validatedData.email,
      password: hashedPassword,
      phoneNumber: validatedData.phoneNumber,
      address: validatedData.address
    }
  });

  // Generate token
  const token = generateToken(customer.id, 'CUSTOMER');

  return {
    success: true,
    message: 'Customer registered successfully',
    data: {
      user: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        role: 'CUSTOMER'
      },
      token
    }
  };
};

// Login user (Admin, Employee, or Customer)
const loginUser = async (email, password) => {
  // Validate input
  userSchema.login.parse({ email, password });

  // Try to find user in all three tables
  let user, role;

  const customer = await prisma.customer.findUnique({ where: { email } });
  if (customer && customer.isActive) {
    user = customer;
    role = 'CUSTOMER';
  } else {
    const employee = await prisma.employee.findUnique({ where: { email } });
    if (employee && employee.isActive) {
      user = employee;
      role = 'EMPLOYEE';
    } else {
      const admin = await prisma.admin.findUnique({ where: { email } });
      if (admin && admin.isActive) {
        user = admin;
        role = 'ADMIN';
      }
    }
  }

  if (!user) {
    throw new Error('Invalid credentials');
  }

  // Check password
  const isPasswordValid = await comparePassword(password, user.password);
  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  // Generate token
  const token = generateToken(user.id, role);

  return {
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: role,
        phoneNumber: user.phoneNumber,
        address: user.address
      },
      token
    }
  };
};

// Forgot password
const forgotPassword = async (email) => {
  // Validate email
  userSchema.login.parse({ email, password: 'dummy' }); // Just validate email format

  // Try to find user in all tables
  let user, role;

  const customer = await prisma.customer.findUnique({ where: { email } });
  if (customer && customer.isActive) {
    user = customer;
    role = 'CUSTOMER';
  } else {
    const employee = await prisma.employee.findUnique({ where: { email } });
    if (employee && employee.isActive) {
      user = employee;
      role = 'EMPLOYEE';
    } else {
      const admin = await prisma.admin.findUnique({ where: { email } });
      if (admin && admin.isActive) {
        user = admin;
        role = 'ADMIN';
      }
    }
  }

  if (!user) {
    // Don't reveal if user exists or not for security
    return {
      success: true,
      message: 'If this email exists, a password reset code has been sent'
    };
  }

  // Generate reset code
  const resetCode = crypto.randomInt(100000, 999999).toString();
  const resetExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  // Update user with reset code
  await prisma[role.toLowerCase()].update({
    where: { id: user.id },
    data: {
      resetCode,
      resetExpiry
    }
  });

  // In a real application, you would send an email here
  // For now, we'll just return the code (remove this in production)
  return {
    success: true,
    message: 'Password reset code sent',
    data: {
      resetCode, // Remove this in production
      email: user.email
    }
  };
};

// Verify reset code
const verifyResetCode = async (email, resetCode) => {
  // Validate email
  userSchema.login.parse({ email, password: 'dummy' });

  // Try to find user in all tables
  let user, role;

  const customer = await prisma.customer.findUnique({ 
    where: { 
      email,
      resetCode,
      resetExpiry: { gt: new Date() }
    }
  });
  if (customer && customer.isActive) {
    user = customer;
    role = 'CUSTOMER';
  } else {
    const employee = await prisma.employee.findUnique({ 
      where: { 
        email,
        resetCode,
        resetExpiry: { gt: new Date() }
      }
    });
    if (employee && employee.isActive) {
      user = employee;
      role = 'EMPLOYEE';
    } else {
      const admin = await prisma.admin.findUnique({ 
        where: { 
          email,
          resetCode,
          resetExpiry: { gt: new Date() }
        }
      });
      if (admin && admin.isActive) {
        user = admin;
        role = 'ADMIN';
      }
    }
  }

  if (!user) {
    throw new Error('Invalid or expired reset code');
  }

  return {
    success: true,
    message: 'Reset code verified successfully'
  };
};

// Reset password
const resetPassword = async (email, resetCode, newPassword) => {
  // Validate input
  userSchema.changePassword.parse({ 
    currentPassword: 'dummy', 
    newPassword 
  });

  // Try to find user in all tables
  let user, role;

  const customer = await prisma.customer.findUnique({ 
    where: { 
      email,
      resetCode,
      resetExpiry: { gt: new Date() }
    }
  });
  if (customer && customer.isActive) {
    user = customer;
    role = 'CUSTOMER';
  } else {
    const employee = await prisma.employee.findUnique({ 
      where: { 
        email,
        resetCode,
        resetExpiry: { gt: new Date() }
      }
    });
    if (employee && employee.isActive) {
      user = employee;
      role = 'EMPLOYEE';
    } else {
      const admin = await prisma.admin.findUnique({ 
        where: { 
          email,
          resetCode,
          resetExpiry: { gt: new Date() }
        }
      });
      if (admin && admin.isActive) {
        user = admin;
        role = 'ADMIN';
      }
    }
  }

  if (!user) {
    throw new Error('Invalid or expired reset code');
  }

  // Hash new password
  const hashedPassword = await hashPassword(newPassword);

  // Update password and clear reset fields
  await prisma[role.toLowerCase()].update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      resetCode: null,
      resetExpiry: null
    }
  });

  return {
    success: true,
    message: 'Password reset successfully'
  };
};

// Get current user profile
const getCurrentUserProfile = async (userId, role) => {
  let user;

  switch (role) {
    case 'CUSTOMER':
      user = await prisma.customer.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
          address: true,
          dateOfBirth: true,
          profileImage: true,
          createdAt: true
        }
      });
      break;
    case 'EMPLOYEE':
      user = await prisma.employee.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
          address: true,
          position: true,
          hireDate: true,
          salary: true,
          createdAt: true
        }
      });
      break;
    case 'ADMIN':
      user = await prisma.admin.findUnique({
        where: { id: userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
          address: true,
          createdAt: true
        }
      });
      break;
    default:
      throw new Error('Invalid role');
  }

  if (!user) {
    throw new Error('User not found');
  }

  return {
    success: true,
    data: {
      user
    }
  };
};

module.exports = {
  registerCustomer,
  loginUser,
  forgotPassword,
  verifyResetCode,
  resetPassword,
  getCurrentUserProfile
};