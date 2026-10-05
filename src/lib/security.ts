import { hash, verify } from '@node-rs/argon2';
import * as crypto from 'crypto';
import { SignJWT, jwtVerify } from 'jose';
import { env } from './env';

// Argon2id Options
const ARGON2_OPTIONS = {
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  outputLen: 32,
  parallelism: 1,
};

/**
 * Hashes a plaintext password using Argon2id.
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

/**
 * Verifies a plaintext password against an Argon2id hash.
 */
export async function verifyPassword(hashVal: string, plain: string): Promise<boolean> {
  try {
    return await verify(hashVal, plain);
  } catch {
    return false;
  }
}

/**
 * Validates password complexity.
 * Minimum 8 characters, at least 1 uppercase letter, 1 lowercase letter, 1 number, 1 special character.
 */
export function validatePasswordStrength(password: string): { valid: boolean; reason?: string } {
  if (password.length < 8) {
    return { valid: false, reason: 'Password must be at least 8 characters long.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one uppercase letter.' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one lowercase letter.' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one number.' };
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    return { valid: false, reason: 'Password must contain at least one special character.' };
  }
  return { valid: true };
}

/**
 * Generates a cryptographically secure random hex token.
 */
export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

/**
 * Generates a SHA-256 hash of a token for secure database storage.
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generates a 6-digit numeric OTP code.
 */
export function generateOtpCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Signs a JWT with user payload.
 */
export async function signAuthToken(payload: { userId: string; role: string; email?: string }): Promise<string> {
  const secret = new TextEncoder().encode(env.JWT_SECRET);
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

/**
 * Verifies an incoming JWT.
 */
export async function verifyAuthToken(token: string): Promise<{ userId: string; role: string; email?: string } | null> {
  try {
    const secret = new TextEncoder().encode(env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    return payload as { userId: string; role: string; email?: string };
  } catch {
    return null;
  }
}

/**
 * Verifies Razorpay HMAC SHA-256 payment signature.
 */
export function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secretKey = env.RAZORPAY_KEY_SECRET
): boolean {
  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', secretKey)
    .update(body)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'utf-8'),
    Buffer.from(signature, 'utf-8')
  );
}

/**
 * Verifies Razorpay Webhook HMAC SHA-256 signature.
 */
export function verifyWebhookSignature(
  payloadString: string,
  signature: string,
  webhookSecret = env.RAZORPAY_WEBHOOK_SECRET
): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(payloadString)
    .digest('hex');

  if (expectedSignature.length !== signature.length) {
    return false;
  }

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'utf-8'),
    Buffer.from(signature, 'utf-8')
  );
}

/**
 * In-memory sliding window rate limiter.
 * Suitable for single-node / serverless instances, easily swappable with Redis.
 */
interface RateLimitRecord {
  timestamps: number[];
}
const rateLimitStore = new Map<string, RateLimitRecord>();

export function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): { allowed: boolean; remaining: number; resetInSeconds: number } {
  const now = Date.now();
  const windowMs = windowSeconds * 1000;
  const record = rateLimitStore.get(key) || { timestamps: [] };

  // Filter timestamps within window
  const validTimestamps = record.timestamps.filter((t) => now - t < windowMs);

  if (validTimestamps.length >= maxRequests) {
    const oldest = validTimestamps[0];
    const resetInSeconds = Math.ceil((oldest + windowMs - now) / 1000);
    return { allowed: false, remaining: 0, resetInSeconds };
  }

  validTimestamps.push(now);
  rateLimitStore.set(key, { timestamps: validTimestamps });

  return {
    allowed: true,
    remaining: maxRequests - validTimestamps.length,
    resetInSeconds: windowSeconds,
  };
}

/**
 * Sanitizes strings against common XSS injection attacks.
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}
