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

module.exports = { LoginSchema, StaffLoginSchema, CustomerLoginSchema, CustomerSignupSchema };
