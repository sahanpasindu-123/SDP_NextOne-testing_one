const { z } = require("zod");

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const CustomerSignupSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
});

module.exports = { LoginSchema, CustomerSignupSchema };
