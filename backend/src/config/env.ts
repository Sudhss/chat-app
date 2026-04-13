import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV:              z.enum(['development', 'production', 'test']).default('development'),
  PORT:                  z.string().default('4000').transform(Number),
  DATABASE_URL:          z.string().min(1),
  REDIS_URL:             z.string().default('redis://localhost:6379'),
  JWT_ACCESS_SECRET:     z.string().min(32),
  JWT_REFRESH_SECRET:    z.string().min(32),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN:z.string().default('30d'),
  CLIENT_URL:            z.string().default('http://localhost:3000'),
  AWS_REGION:            z.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID:     z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  S3_BUCKET_NAME:        z.string().default('flux-media'),
  S3_ENDPOINT:           z.string().optional(),
  GOOGLE_CLIENT_ID:      z.string().optional(),
  GOOGLE_CLIENT_SECRET:  z.string().optional(),
  COOKIE_SECRET:         z.string().min(32),
  BCRYPT_ROUNDS:         z.string().default('12').transform(Number),
  MAX_FILE_SIZE_MB:      z.string().default('25').transform(Number),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
