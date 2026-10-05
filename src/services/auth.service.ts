import { db } from '@/lib/db';
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  generateSecureToken,
  hashToken,
  generateOtpCode,
  signAuthToken,
  checkRateLimit,
} from '@/lib/security';
import { AppError } from '@/lib/api-response';
import { AuditService } from './audit.service';
import * as crypto from 'crypto';

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface LoginInput {
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface PhoneOtpRequestInput {
  phone: string;
  ipAddress?: string;
}

export interface PhoneOtpVerifyInput {
  phone: string;
  code: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface GoogleAuthInput {
  googleId: string;
  email: string;
  name: string;
  avatarUrl?: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthSessionResult {
  user: {
    id: string;
    email: string | null;
    phone: string | null;
    name: string;
    username: string | null;
    role: string;
    avatarUrl: string | null;
    emailVerified: boolean;
    phoneVerified: boolean;
  };
  sessionToken: string;
  jwtToken: string;
  expiresAt: Date;
}

export class AuthService {
  /**
   * Register with Email & Password.
   */
  static async register(input: RegisterInput): Promise<{ userId: string; verificationToken: string }> {
    // 1. Validate inputs
    const email = input.email.trim().toLowerCase();
    const name = input.name.trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new AppError('VALIDATION_ERROR', 'A valid email address is required.');
    }
    if (!name || name.length < 2) {
      throw new AppError('VALIDATION_ERROR', 'Name must be at least 2 characters long.');
    }

    const strength = validatePasswordStrength(input.password);
    if (!strength.valid) {
      throw new AppError('VALIDATION_ERROR', strength.reason || 'Password does not meet strength requirements.');
    }

    // Rate limit registration per IP
    if (input.ipAddress) {
      const rl = checkRateLimit(`register:${input.ipAddress}`, 5, 300);
      if (!rl.allowed) {
        throw new AppError('RATE_LIMITED', `Too many registration attempts. Please retry in ${rl.resetInSeconds}s.`, 429);
      }
    }

    // 2. Check if user already exists
    const existing = await db.queryOne<{ id: string }>('SELECT id FROM "User" WHERE email = $1;', [email]);
    if (existing) {
      throw new AppError('CONFLICT', 'An account with this email address already exists.');
    }

    // 3. Hash password with Argon2id
    const passwordHash = await hashPassword(input.password);
    const userId = crypto.randomUUID();

    // 4. Create user record and identity in transaction
    const rawVerificationToken = generateSecureToken(32);
    const hashedVerificationToken = hashToken(rawVerificationToken);

    await db.transaction(async (tx) => {
      await tx.execute(
        `INSERT INTO "User" (id, email, name, "passwordHash", role, status, "emailVerified", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, 'USER', 'ACTIVE', false, NOW(), NOW());`,
        [userId, email, name, passwordHash]
      );

      // Create email identity
      await tx.execute(
        `INSERT INTO "UserIdentity" (id, "userId", provider, "providerUserId", "createdAt", "updatedAt")
         VALUES ($1, $2, 'EMAIL', $3, NOW(), NOW());`,
        [crypto.randomUUID(), userId, email]
      );

      // Create default privacy settings
      await tx.execute(
        `INSERT INTO "PrivacySettings" (id, "userId", "isProfilePublic", "showReadingActivity", "showReviews", "allowPersonalization", "allowAnalytics", "allowMarketing", "allowPushAlerts", "allowPersonalizedAds", "createdAt", "updatedAt")
         VALUES ($1, $2, false, false, true, true, true, false, true, false, NOW(), NOW());`,
        [crypto.randomUUID(), userId]
      );

      // Create default notification preferences
      await tx.execute(
        `INSERT INTO "NotificationPreferences" (id, "userId", "emailNotifications", "pushNotifications", "inAppNotifications", "marketingEmails", "securityAlerts", "newReleaseAlerts", "createdAt", "updatedAt")
         VALUES ($1, $2, true, true, true, false, true, true, NOW(), NOW());`,
        [crypto.randomUUID(), userId]
      );

      // Create email verification token (expires in 24 hours)
      await tx.execute(
        `INSERT INTO "EmailVerificationToken" (id, "userId", "tokenHash", "expiresAt", "createdAt")
         VALUES ($1, $2, $3, NOW() + INTERVAL '24 hours', NOW());`,
        [crypto.randomUUID(), userId, hashedVerificationToken]
      );
    });

    await AuditService.log({
      userId,
      action: 'USER_REGISTERED',
      resource: 'User',
      resourceId: userId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      details: { email },
    });

    return { userId, verificationToken: rawVerificationToken };
  }

  /**
   * Login with Email & Password.
   */
  static async login(input: LoginInput): Promise<AuthSessionResult> {
    const email = input.email.trim().toLowerCase();

    // Rate limit login attempts per IP and per email
    if (input.ipAddress) {
      const ipRl = checkRateLimit(`login_ip:${input.ipAddress}`, 15, 60);
      if (!ipRl.allowed) {
        throw new AppError('RATE_LIMITED', `Too many login attempts. Please retry in ${ipRl.resetInSeconds}s.`, 429);
      }
    }
    const emailRl = checkRateLimit(`login_email:${email}`, 5, 300);
    if (!emailRl.allowed) {
      throw new AppError('RATE_LIMITED', `Account temporarily locked due to failed attempts. Please retry in ${emailRl.resetInSeconds}s.`, 429);
    }

    const user = await db.queryOne<{
      id: string;
      email: string;
      phone: string | null;
      name: string;
      username: string | null;
      passwordHash: string | null;
      role: string;
      avatarUrl: string | null;
      emailVerified: boolean;
      phoneVerified: boolean;
      status: string;
    }>('SELECT * FROM "User" WHERE email = $1;', [email]);

    // Use constant-time or generic error message to prevent account enumeration
    if (!user || !user.passwordHash || user.status === 'DELETED') {
      throw new AppError('UNAUTHORIZED', 'Invalid email or password.');
    }

    if (user.status === 'SUSPENDED') {
      throw new AppError('FORBIDDEN', 'This account has been suspended. Please contact support.');
    }

    const isMatch = await verifyPassword(user.passwordHash, input.password);
    if (!isMatch) {
      await AuditService.log({
        userId: user.id,
        action: 'LOGIN_FAILED',
        resource: 'User',
        resourceId: user.id,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        details: { reason: 'Incorrect password' },
      });
      throw new AppError('UNAUTHORIZED', 'Invalid email or password.');
    }

    // Create session
    return this.createSession(user, input.ipAddress, input.userAgent);
  }

  /**
   * Request Phone OTP for SMS Login / Registration.
   */
  static async requestPhoneOtp(input: PhoneOtpRequestInput): Promise<{ success: boolean; message: string; mockOtp?: string }> {
    const rawPhone = input.phone.trim();
    // Validate E.164 phone format (+[country][number] or 10 digits)
    const cleanedPhone = rawPhone.replace(/[^\d+]/g, '');
    if (cleanedPhone.length < 10) {
      throw new AppError('VALIDATION_ERROR', 'Please enter a valid phone number with country code.');
    }

    // Rate limiting: 3 OTP requests per phone per 10 minutes
    const phoneRl = checkRateLimit(`otp_req:${cleanedPhone}`, 3, 600);
    if (!phoneRl.allowed) {
      throw new AppError('RATE_LIMITED', `Too many OTP requests. Please wait ${phoneRl.resetInSeconds}s.`, 429);
    }

    const otpCode = generateOtpCode();
    const otpHash = hashToken(otpCode);
    const id = crypto.randomUUID();

    // Expire old unused OTPs for this phone
    await db.execute('DELETE FROM "PhoneOtpCode" WHERE phone = $1;', [cleanedPhone]);

    // Insert new OTP with 5-minute expiry
    await db.execute(
      `INSERT INTO "PhoneOtpCode" (id, phone, "codeHash", attempts, "expiresAt", "createdAt")
       VALUES ($1, $2, $3, 0, NOW() + INTERVAL '5 minutes', NOW());`,
      [id, cleanedPhone, otpHash]
    );

    await AuditService.log({
      action: 'OTP_REQUESTED',
      resource: 'PhoneOtpCode',
      ipAddress: input.ipAddress,
      details: { phone: cleanedPhone.slice(-4).padStart(cleanedPhone.length, '*') },
    });

    // In local dev/mock mode, return the OTP for developer convenience
    return {
      success: true,
      message: 'Verification code sent to your phone number.',
      mockOtp: otpCode,
    };
  }

  /**
   * Verify Phone OTP and Login/Register.
   */
  static async verifyPhoneOtp(input: PhoneOtpVerifyInput): Promise<AuthSessionResult> {
    const cleanedPhone = input.phone.trim().replace(/[^\d+]/g, '');
    const code = input.code.trim();

    const otpRecord = await db.queryOne<{
      id: string;
      phone: string;
      codeHash: string;
      attempts: number;
      expiresAt: Date;
    }>('SELECT * FROM "PhoneOtpCode" WHERE phone = $1 AND "verifiedAt" IS NULL ORDER BY "createdAt" DESC LIMIT 1;', [cleanedPhone]);

    if (!otpRecord) {
      throw new AppError('BAD_REQUEST', 'No active OTP found. Please request a new code.');
    }

    if (new Date() > new Date(otpRecord.expiresAt)) {
      throw new AppError('BAD_REQUEST', 'OTP has expired. Please request a new code.');
    }

    if (otpRecord.attempts >= 5) {
      await db.execute('DELETE FROM "PhoneOtpCode" WHERE id = $1;', [otpRecord.id]);
      throw new AppError('BAD_REQUEST', 'Maximum verification attempts exceeded. Please request a new code.');
    }

    const incomingHash = hashToken(code);
    if (incomingHash !== otpRecord.codeHash) {
      await db.execute('UPDATE "PhoneOtpCode" SET attempts = attempts + 1 WHERE id = $1;', [otpRecord.id]);
      throw new AppError('BAD_REQUEST', 'Incorrect verification code.');
    }

    // Mark OTP as verified (prevent replay)
    await db.execute('UPDATE "PhoneOtpCode" SET "verifiedAt" = NOW() WHERE id = $1;', [otpRecord.id]);

    // Find or create user
    let user = await db.queryOne<{
      id: string;
      email: string | null;
      phone: string | null;
      name: string;
      username: string | null;
      role: string;
      avatarUrl: string | null;
      emailVerified: boolean;
      phoneVerified: boolean;
      status: string;
    }>('SELECT * FROM "User" WHERE phone = $1;', [cleanedPhone]);

    if (!user) {
      // Create new phone user
      const userId = crypto.randomUUID();
      await db.transaction(async (tx) => {
        await tx.execute(
          `INSERT INTO "User" (id, phone, name, role, status, "phoneVerified", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, 'USER', 'ACTIVE', true, NOW(), NOW());`,
          [userId, cleanedPhone, `User_${cleanedPhone.slice(-4)}`]
        );

        await tx.execute(
          `INSERT INTO "UserIdentity" (id, "userId", provider, "providerUserId", "createdAt", "updatedAt")
           VALUES ($1, $2, 'PHONE', $3, NOW(), NOW());`,
          [crypto.randomUUID(), userId, cleanedPhone]
        );

        await tx.execute(
          `INSERT INTO "PrivacySettings" (id, "userId", "isProfilePublic", "showReadingActivity", "showReviews", "allowPersonalization", "allowAnalytics", "allowMarketing", "allowPushAlerts", "allowPersonalizedAds", "createdAt", "updatedAt")
           VALUES ($1, $2, false, false, true, true, true, false, true, false, NOW(), NOW());`,
          [crypto.randomUUID(), userId]
        );
      });

      user = await db.queryOne('SELECT * FROM "User" WHERE id = $1;', [userId]);
    } else {
      // Mark phone verified if not already
      if (!user.phoneVerified) {
        await db.execute('UPDATE "User" SET "phoneVerified" = true, "updatedAt" = NOW() WHERE id = $1;', [user.id]);
        user.phoneVerified = true;
      }
    }

    if (!user) throw new AppError('INTERNAL_ERROR', 'Failed to retrieve user after OTP validation.');

    return this.createSession(user, input.ipAddress, input.userAgent);
  }

  /**
   * Google OAuth / OIDC Identity Login & Account Linking.
   */
  static async googleAuth(input: GoogleAuthInput): Promise<AuthSessionResult> {
    const email = input.email.trim().toLowerCase();

    // Check if Google identity already linked
    const existingIdentity = await db.queryOne<{ userId: string }>(
      'SELECT "userId" FROM "UserIdentity" WHERE provider = $1 AND "providerUserId" = $2;',
      ['GOOGLE', input.googleId]
    );

    let user: any = null;

    if (existingIdentity) {
      user = await db.queryOne('SELECT * FROM "User" WHERE id = $1;', [existingIdentity.userId]);
    } else {
      // Check if user with this email exists (Link Account)
      const existingUser = await db.queryOne<any>('SELECT * FROM "User" WHERE email = $1;', [email]);

      if (existingUser) {
        // Link Google identity to existing account
        await db.execute(
          `INSERT INTO "UserIdentity" (id, "userId", provider, "providerUserId", "identityData", "createdAt", "updatedAt")
           VALUES ($1, $2, 'GOOGLE', $3, $4, NOW(), NOW());`,
          [crypto.randomUUID(), existingUser.id, input.googleId, JSON.stringify({ name: input.name, avatar: input.avatarUrl })]
        );

        // Update emailVerified and avatar if not set
        await db.execute(
          `UPDATE "User" SET "emailVerified" = true, "avatarUrl" = COALESCE("avatarUrl", $1), "updatedAt" = NOW() WHERE id = $2;`,
          [input.avatarUrl || null, existingUser.id]
        );

        user = existingUser;
      } else {
        // Create new user with Google identity
        const userId = crypto.randomUUID();
        await db.transaction(async (tx) => {
          await tx.execute(
            `INSERT INTO "User" (id, email, name, role, status, "avatarUrl", "emailVerified", "createdAt", "updatedAt")
             VALUES ($1, $2, $3, 'USER', 'ACTIVE', $4, true, NOW(), NOW());`,
            [userId, email, input.name, input.avatarUrl || null]
          );

          await tx.execute(
            `INSERT INTO "UserIdentity" (id, "userId", provider, "providerUserId", "identityData", "createdAt", "updatedAt")
             VALUES ($1, $2, 'GOOGLE', $3, $4, NOW(), NOW());`,
            [crypto.randomUUID(), userId, input.googleId, JSON.stringify({ name: input.name })]
          );

          await tx.execute(
            `INSERT INTO "PrivacySettings" (id, "userId", "isProfilePublic", "showReadingActivity", "showReviews", "allowPersonalization", "allowAnalytics", "allowMarketing", "allowPushAlerts", "allowPersonalizedAds", "createdAt", "updatedAt")
             VALUES ($1, $2, false, false, true, true, true, false, true, false, NOW(), NOW());`,
            [crypto.randomUUID(), userId]
          );
        });

        user = await db.queryOne('SELECT * FROM "User" WHERE id = $1;', [userId]);
      }
    }

    if (!user || user.status === 'SUSPENDED') {
      throw new AppError('FORBIDDEN', 'User account unavailable or suspended.');
    }

    return this.createSession(user, input.ipAddress, input.userAgent);
  }

  /**
   * Helper: creates database session and signs JWT token.
   */
  private static async createSession(
    user: {
      id: string;
      email: string | null;
      phone: string | null;
      name: string;
      username: string | null;
      role: string;
      avatarUrl: string | null;
      emailVerified: boolean;
      phoneVerified: boolean;
    },
    ipAddress?: string,
    userAgent?: string
  ): Promise<AuthSessionResult> {
    const sessionToken = generateSecureToken(32);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await db.execute(
      `INSERT INTO "Session" (id, "userId", "sessionToken", "ipAddress", "userAgent", "expiresAt", "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW());`,
      [crypto.randomUUID(), user.id, sessionToken, ipAddress || null, userAgent || null, expiresAt]
    );

    const jwtToken = await signAuthToken({
      userId: user.id,
      role: user.role,
      email: user.email || undefined,
    });

    await AuditService.log({
      userId: user.id,
      action: 'USER_LOGIN',
      resource: 'Session',
      ipAddress,
      userAgent,
      details: { role: user.role },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        username: user.username,
        role: user.role,
        avatarUrl: user.avatarUrl,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
      },
      sessionToken,
      jwtToken,
      expiresAt,
    };
  }

  /**
   * Validate session token from cookie/header.
   */
  static async validateSession(sessionToken: string) {
    if (!sessionToken) return null;

    const session = await db.queryOne<{
      id: string;
      userId: string;
      expiresAt: Date;
      name: string;
      email: string | null;
      phone: string | null;
      username: string | null;
      role: string;
      avatarUrl: string | null;
      status: string;
      emailVerified: boolean;
      phoneVerified: boolean;
    }>(
      `SELECT s.id, s."userId", s."expiresAt", u.name, u.email, u.phone, u.username, u.role, u."avatarUrl", u.status, u."emailVerified", u."phoneVerified"
       FROM "Session" s
       JOIN "User" u ON s."userId" = u.id
       WHERE s."sessionToken" = $1 AND s."expiresAt" > NOW() AND u.status = 'ACTIVE';`,
      [sessionToken]
    );

    if (!session) return null;

    return {
      sessionId: session.id,
      user: {
        id: session.userId,
        name: session.name,
        email: session.email,
        phone: session.phone,
        username: session.username,
        role: session.role,
        avatarUrl: session.avatarUrl,
        emailVerified: session.emailVerified,
        phoneVerified: session.phoneVerified,
      },
    };
  }

  /**
   * Logout from current session.
   */
  static async logout(sessionToken: string): Promise<void> {
    await db.execute('DELETE FROM "Session" WHERE "sessionToken" = $1;', [sessionToken]);
  }

  /**
   * Logout from all devices for user.
   */
  static async logoutAllDevices(userId: string): Promise<void> {
    await db.execute('DELETE FROM "Session" WHERE "userId" = $1;', [userId]);
    await AuditService.log({
      userId,
      action: 'LOGOUT_ALL_DEVICES',
      resource: 'Session',
    });
  }

  /**
   * Forgot Password request.
   */
  static async requestPasswordReset(emailInput: string, ipAddress?: string): Promise<{ success: boolean; token?: string }> {
    const email = emailInput.trim().toLowerCase();
    const user = await db.queryOne<{ id: string }>('SELECT id FROM "User" WHERE email = $1 AND status = \'ACTIVE\';', [email]);

    // Don't leak if email exists
    if (!user) {
      return { success: true };
    }

    const rawToken = generateSecureToken(32);
    const tokenHash = hashToken(rawToken);

    // Delete existing reset tokens
    await db.execute('DELETE FROM "PasswordResetToken" WHERE "userId" = $1;', [user.id]);

    // Insert new token (expires in 1 hour)
    await db.execute(
      `INSERT INTO "PasswordResetToken" (id, "userId", "tokenHash", "expiresAt", "createdAt")
       VALUES ($1, $2, $3, NOW() + INTERVAL '1 hour', NOW());`,
      [crypto.randomUUID(), user.id, tokenHash]
    );

    await AuditService.log({
      userId: user.id,
      action: 'PASSWORD_RESET_REQUESTED',
      resource: 'PasswordResetToken',
      ipAddress,
    });

    return { success: true, token: rawToken };
  }

  /**
   * Reset Password with token.
   */
  static async resetPassword(token: string, newPassword: string, ipAddress?: string): Promise<void> {
    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid) {
      throw new AppError('VALIDATION_ERROR', strength.reason || 'Password does not meet requirements.');
    }

    const incomingHash = hashToken(token);
    const resetRecord = await db.queryOne<{ id: string; userId: string; expiresAt: Date; usedAt: Date | null }>(
      'SELECT * FROM "PasswordResetToken" WHERE "tokenHash" = $1;',
      [incomingHash]
    );

    if (!resetRecord || resetRecord.usedAt !== null || new Date() > new Date(resetRecord.expiresAt)) {
      throw new AppError('BAD_REQUEST', 'Password reset token is invalid or has expired.');
    }

    const newPasswordHash = await hashPassword(newPassword);

    await db.transaction(async (tx) => {
      await tx.execute('UPDATE "User" SET "passwordHash" = $1, "updatedAt" = NOW() WHERE id = $2;', [newPasswordHash, resetRecord.userId]);
      await tx.execute('UPDATE "PasswordResetToken" SET "usedAt" = NOW() WHERE id = $1;', [resetRecord.id]);
      // Invalidate all existing sessions on password reset for security
      await tx.execute('DELETE FROM "Session" WHERE "userId" = $1;', [resetRecord.userId]);
    });

    await AuditService.log({
      userId: resetRecord.userId,
      action: 'PASSWORD_RESET_COMPLETED',
      resource: 'User',
      ipAddress,
    });
  }

  /**
   * Verify Email Address with token.
   */
  static async verifyEmail(token: string): Promise<boolean> {
    const incomingHash = hashToken(token);
    const tokenRecord = await db.queryOne<{ id: string; userId: string; expiresAt: Date; usedAt: Date | null }>(
      'SELECT * FROM "EmailVerificationToken" WHERE "tokenHash" = $1;',
      [incomingHash]
    );

    if (!tokenRecord || tokenRecord.usedAt !== null || new Date() > new Date(tokenRecord.expiresAt)) {
      throw new AppError('BAD_REQUEST', 'Verification link is invalid or has expired.');
    }

    await db.transaction(async (tx) => {
      await tx.execute('UPDATE "User" SET "emailVerified" = true, "updatedAt" = NOW() WHERE id = $1;', [tokenRecord.userId]);
      await tx.execute('UPDATE "EmailVerificationToken" SET "usedAt" = NOW() WHERE id = $1;', [tokenRecord.id]);
    });

    await AuditService.log({
      userId: tokenRecord.userId,
      action: 'EMAIL_VERIFIED',
      resource: 'User',
    });

    return true;
  }
}
