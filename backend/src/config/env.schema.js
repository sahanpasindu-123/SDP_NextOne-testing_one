const { z } = require("zod");

const EnvSchema = z.object({
  NODE_ENV: z.string().optional(),
  PORT: z.string().optional(),
  DATABASE_URL: z.string().min(1, "DATABASE_URL required"),
  JWT_SECRET: z.string().optional(),
  JWT_ACCESS_SECRET: z.string().optional(),
  CORS_ORIGIN: z.string().optional(),
});

module.exports = { EnvSchema };
