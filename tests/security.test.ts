import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  generateSecureToken,
  hashToken,
  signAuthToken,
  verifyAuthToken,
  verifyRazorpaySignature,
  checkRateLimit,
  sanitizeString,
} from '../src/lib/security';

describe('Security & Cryptography Subsystem', () => {
  it('hashes passwords using Argon2id and verifies correctly', async () => {
    const rawPassword = 'SecurePassword@123';
    const hash = await hashPassword(rawPassword);

    expect(hash).toContain('$argon2id$');
    const isCorrect = await verifyPassword(hash, rawPassword);
    expect(isCorrect).toBe(true);

    const isWrong = await verifyPassword(hash, 'WrongPassword@123');
    expect(isWrong).toBe(false);
  });

  it('enforces strong password validation rules', () => {
    expect(validatePasswordStrength('short1!').valid).toBe(false);
    expect(validatePasswordStrength('nouppercase1!').valid).toBe(false);
    expect(validatePasswordStrength('NOLOWERCASE1!').valid).toBe(false);
    expect(validatePasswordStrength('NoNumbers!').valid).toBe(false);
    expect(validatePasswordStrength('NoSpecialChar123').valid).toBe(false);

    const valid = validatePasswordStrength('ValidPassword@2026');
    expect(valid.valid).toBe(true);
  });

  it('generates secure hex tokens and sha256 token hashes', () => {
    const token = generateSecureToken(32);
    expect(token).toHaveLength(64);

    const hashed = hashToken(token);
    expect(hashed).toHaveLength(64);
    expect(hashed).not.toEqual(token);
  });

  it('signs and verifies JWT authentication tokens', async () => {
    const payload = { userId: 'usr-1234', role: 'ADMIN', email: 'admin@comic.test' };
    const token = await signAuthToken(payload);
    expect(typeof token).toBe('string');

    const verified = await verifyAuthToken(token);
    expect(verified).not.toBeNull();
    expect(verified?.userId).toBe('usr-1234');
    expect(verified?.role).toBe('ADMIN');
  });

  it('verifies Razorpay HMAC SHA-256 signatures with timingSafeEqual', () => {
    const orderId = 'order_test_987';
    const paymentId = 'pay_test_456';
    const secret = 'rzp_test_secret_key';

    const crypto = require('crypto');
    const validSig = crypto
      .createHmac('sha256', secret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    expect(verifyRazorpaySignature(orderId, paymentId, validSig, secret)).toBe(true);
    expect(verifyRazorpaySignature(orderId, paymentId, 'tampered_signature', secret)).toBe(false);
  });

  it('enforces sliding window rate limits', () => {
    const key = `test_rate_limit_${Date.now()}`;
    const limit = 3;
    const windowSecs = 2;

    const r1 = checkRateLimit(key, limit, windowSecs);
    expect(r1.allowed).toBe(true);

    const r2 = checkRateLimit(key, limit, windowSecs);
    expect(r2.allowed).toBe(true);

    const r3 = checkRateLimit(key, limit, windowSecs);
    expect(r3.allowed).toBe(true);

    const r4 = checkRateLimit(key, limit, windowSecs);
    expect(r4.allowed).toBe(false);
    expect(r4.remaining).toBe(0);
  });

  it('sanitizes malicious script tags to prevent XSS', () => {
    const raw = '<script>alert("xss")</script>';
    const safe = sanitizeString(raw);
    expect(safe).not.toContain('<script>');
    expect(safe).toContain('&lt;script&gt;');
  });
});
