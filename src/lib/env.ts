import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().default('embedded'),
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  JWT_SECRET: z.string().min(16).default('c8e76a59b2084c7fbe8b5a1b32d2047d10e34b9d09c3132e4823d069bbf590b1'),
  COOKIE_SECRET: z.string().min(16).default('9f71c4293f0b8daef279934c9c7f66a70e8a7c6b5d4e3f2a1b0c9d8e7f6a5b4c'),
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().default('rzp_test_comic_platform_key_id'),
  RAZORPAY_KEY_SECRET: z.string().default('rzp_test_comic_platform_secret_key_99'),
  RAZORPAY_WEBHOOK_SECRET: z.string().default('rzp_webhook_secret_for_sig_verif_123'),
  GOOGLE_CLIENT_ID: z.string().default('mock-google-client-id.apps.googleusercontent.com'),
  GOOGLE_CLIENT_SECRET: z.string().default('mock-google-client-secret'),
  OTP_MOCK_MODE: z.string().default('true').transform((val) => val === 'true'),
  STORAGE_PROVIDER: z.enum(['local', 's3', 'gcs']).default('local'),
  STORAGE_BUCKET: z.string().default('comic-platform-media'),
  CDN_URL: z.string().default('http://localhost:3000/media'),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NODE_ENV: process.env.NODE_ENV,
  JWT_SECRET: process.env.JWT_SECRET,
  COOKIE_SECRET: process.env.COOKIE_SECRET,
  NEXT_PUBLIC_RAZORPAY_KEY_ID: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  RAZORPAY_KEY_SECRET: process.env.RAZORPAY_KEY_SECRET,
  RAZORPAY_WEBHOOK_SECRET: process.env.RAZORPAY_WEBHOOK_SECRET,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  OTP_MOCK_MODE: process.env.OTP_MOCK_MODE,
  STORAGE_PROVIDER: process.env.STORAGE_PROVIDER,
  STORAGE_BUCKET: process.env.STORAGE_BUCKET,
  CDN_URL: process.env.CDN_URL,
});
