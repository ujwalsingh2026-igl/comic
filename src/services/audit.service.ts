import { db } from '@/lib/db';
import * as crypto from 'crypto';

export interface AuditLogInput {
  userId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  details?: Record<string, unknown> | null;
}

export class AuditService {
  /**
   * Records a sanitized audit log entry to PostgreSQL.
   */
  static async log(input: AuditLogInput): Promise<void> {
    try {
      const sanitizedDetails = input.details ? this.sanitize(input.details) : null;
      const id = crypto.randomUUID();

      await db.execute(
        `INSERT INTO "AuditLog" ("id", "userId", "action", "resource", "resourceId", "ipAddress", "userAgent", "details", "createdAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW());`,
        [
          id,
          input.userId || null,
          input.action,
          input.resource,
          input.resourceId || null,
          input.ipAddress || null,
          input.userAgent || null,
          sanitizedDetails ? JSON.stringify(sanitizedDetails) : null,
        ]
      );
    } catch (err) {
      // Audit log failures should be logged to stderr without crashing the main user flow
      console.error('[AuditService.log Error]:', err);
    }
  }

  /**
   * Strips out passwords, tokens, secrets, and raw cards from log payloads.
   */
  private static sanitize(obj: Record<string, unknown>): Record<string, unknown> {
    const sensitiveKeys = [
      'password',
      'passwordhash',
      'token',
      'sessiontoken',
      'refreshtoken',
      'otp',
      'code',
      'secret',
      'apikey',
      'cvv',
      'cardnumber',
    ];

    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const lower = key.toLowerCase();
      if (sensitiveKeys.some((s) => lower.includes(s))) {
        clean[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        clean[key] = this.sanitize(value as Record<string, unknown>);
      } else {
        clean[key] = value;
      }
    }
    return clean;
  }

  /**
   * Retrieves recent audit logs for admin review.
   */
  static async getLogs(limit = 50, offset = 0) {
    return db.query(
      `SELECT a.*, u.name as "userName", u.email as "userEmail"
       FROM "AuditLog" a
       LEFT JOIN "User" u ON a."userId" = u.id
       ORDER BY a."createdAt" DESC
       LIMIT $1 OFFSET $2;`,
      [limit, offset]
    );
  }
}
