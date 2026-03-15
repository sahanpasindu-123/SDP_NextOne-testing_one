const { z } = require("zod");

const StaffLoginSchema = z
  .object({
    employeeId: z.union([z.string().min(1), z.number()]).optional(),
    adminId: z.union([z.string().min(1), z.number()]).optional(),
    password: z.string().min(1),
  })
  .refine((data) => data.employeeId || data.adminId, {
    message: "employeeId or adminId is required",
    path: ["employeeId"],
  });

// Legacy alias (staff login only)
const LoginSchema = StaffLoginSchema;

// Customer login remains email-based (separate flow)
const CustomerLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const CustomerSignupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

// Used by /auth/forgot-password and /auth/resend-verification
const EmailSchema = z.object({
  email: z.string().email(),
});

// Used by /auth/verify-email and /auth/verify-code
const VerifyCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().min(1),
});

// Used by /auth/reset-password
const ResetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().min(1),
  newPassword: z.string().min(1),
});

module.exports = {
  LoginSchema,
  StaffLoginSchema,
  CustomerLoginSchema,
  CustomerSignupSchema,
  EmailSchema,
  VerifyCodeSchema,
  ResetPasswordSchema,
};
