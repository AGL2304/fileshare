import 'dotenv/config'
import { z } from 'zod'

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET doit faire au moins 16 caractères'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  STORAGE_TYPE: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_PATH: z.string().default('./uploads'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().default('eu-west-3'),
  AWS_S3_BUCKET: z.string().optional(),
  MAX_FILE_SIZE_BYTES: z.coerce.number().int().positive().default(104857600),
  APP_URL: z.string().url().default('http://localhost:3001'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
})

const parsed = EnvSchema.safeParse(process.env)
if (!parsed.success) {
  console.error('❌ Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}
const env = parsed.data

if (env.NODE_ENV === 'production' && env.JWT_SECRET === 'dev_jwt_secret_change_in_prod') {
  console.error('❌ JWT_SECRET must be changed in production')
  process.exit(1)
}

export const config = {
  server: {
    port: env.PORT,
    host: '0.0.0.0',
    nodeEnv: env.NODE_ENV,
  },
  jwt: {
    secret: env.JWT_SECRET,
    expiresIn: env.JWT_EXPIRES_IN,
    refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
  },
  cors: {
    origin: env.CORS_ORIGIN.split(',').map((s) => s.trim()),
  },
  storage: {
    type: env.STORAGE_TYPE,
    localPath: env.STORAGE_LOCAL_PATH,
    s3: {
      accessKeyId: env.AWS_ACCESS_KEY_ID ?? '',
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY ?? '',
      region: env.AWS_REGION,
      bucket: env.AWS_S3_BUCKET ?? '',
    },
  },
  upload: {
    maxFileSizeBytes: env.MAX_FILE_SIZE_BYTES,
  },
  app: {
    url: env.APP_URL,
    frontendUrl: env.FRONTEND_URL,
  },
} as const

export type Config = typeof config
