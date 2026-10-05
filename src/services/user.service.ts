import { db } from '@/lib/db';
import { AppError } from '@/lib/api-response';
import { AuditService } from './audit.service';

export interface UpdateProfileInput {
  userId: string;
  name?: string;
  username?: string;
  avatarUrl?: string;
}

export interface UpdatePrivacySettingsInput {
  userId: string;
  isProfilePublic?: boolean;
  showReadingActivity?: boolean;
  showReviews?: boolean;
  allowPersonalization?: boolean;
  allowAnalytics?: boolean;
  allowMarketing?: boolean;
  allowPushAlerts?: boolean;
  allowPersonalizedAds?: boolean;
}

export class UserService {
  /**
   * Retrieves user profile and privacy settings.
   */
  static async getProfile(userId: string) {
    const user = await db.queryOne<{
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
      createdAt: Date;
    }>(
      `SELECT id, email, phone, name, username, role, "avatarUrl", "emailVerified", "phoneVerified", status, "createdAt"
       FROM "User" WHERE id = $1;`,
      [userId]
    );

    if (!user) throw new AppError('NOT_FOUND', 'User profile not found.', 404);

    const privacy = await db.queryOne(
      'SELECT * FROM "PrivacySettings" WHERE "userId" = $1;',
      [userId]
    );

    return { user, privacy };
  }

  /**
   * Updates profile fields.
   */
  static async updateProfile(input: UpdateProfileInput) {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    if (input.name !== undefined) {
      if (input.name.trim().length < 2) {
        throw new AppError('VALIDATION_ERROR', 'Name must be at least 2 characters.');
      }
      fields.push(`name = $${idx++}`);
      values.push(input.name.trim());
    }

    if (input.username !== undefined) {
      const cleanUsername = input.username.trim().toLowerCase();
      if (cleanUsername.length > 0) {
        if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
          throw new AppError('VALIDATION_ERROR', 'Username must be 3-20 characters and alphanumeric or underscore.');
        }
        // Check uniqueness
        const existing = await db.queryOne<{ id: string }>(
          'SELECT id FROM "User" WHERE username = $1 AND id != $2;',
          [cleanUsername, input.userId]
        );
        if (existing) throw new AppError('CONFLICT', 'Username is already taken.');
        fields.push(`username = $${idx++}`);
        values.push(cleanUsername);
      } else {
        fields.push(`username = NULL`);
      }
    }

    if (input.avatarUrl !== undefined) {
      fields.push(`"avatarUrl" = $${idx++}`);
      values.push(input.avatarUrl);
    }

    if (fields.length === 0) return this.getProfile(input.userId);

    fields.push(`"updatedAt" = NOW()`);
    values.push(input.userId);

    await db.execute(
      `UPDATE "User" SET ${fields.join(', ')} WHERE id = $${idx};`,
      values
    );

    await AuditService.log({
      userId: input.userId,
      action: 'PROFILE_UPDATED',
      resource: 'User',
      resourceId: input.userId,
    });

    return this.getProfile(input.userId);
  }

  /**
   * Updates user privacy settings.
   */
  static async updatePrivacy(input: UpdatePrivacySettingsInput) {
    const fields: string[] = [];
    const values: any[] = [];
    let idx = 1;

    const boolFields: Array<keyof UpdatePrivacySettingsInput> = [
      'isProfilePublic',
      'showReadingActivity',
      'showReviews',
      'allowPersonalization',
      'allowAnalytics',
      'allowMarketing',
      'allowPushAlerts',
      'allowPersonalizedAds',
    ];

    for (const key of boolFields) {
      if (input[key] !== undefined) {
        fields.push(`"${key}" = $${idx++}`);
        values.push(input[key]);
      }
    }

    if (fields.length === 0) {
      return db.queryOne('SELECT * FROM "PrivacySettings" WHERE "userId" = $1;', [input.userId]);
    }

    fields.push(`"updatedAt" = NOW()`);
    values.push(input.userId);

    await db.execute(
      `UPDATE "PrivacySettings" SET ${fields.join(', ')} WHERE "userId" = $${idx};`,
      values
    );

    await AuditService.log({
      userId: input.userId,
      action: 'PRIVACY_SETTINGS_UPDATED',
      resource: 'PrivacySettings',
      resourceId: input.userId,
    });

    return db.queryOne('SELECT * FROM "PrivacySettings" WHERE "userId" = $1;', [input.userId]);
  }

  /**
   * Data Export: Generates a complete JSON export of all personal data.
   */
  static async exportUserData(userId: string) {
    const user = await db.queryOne(
      'SELECT id, email, phone, name, username, role, "avatarUrl", "createdAt" FROM "User" WHERE id = $1;',
      [userId]
    );
    if (!user) throw new AppError('NOT_FOUND', 'User not found.', 404);

    const privacy = await db.queryOne('SELECT * FROM "PrivacySettings" WHERE "userId" = $1;', [userId]);
    const library = await db.query(
      `SELECT l.shelf, l."createdAt", c.title, c.slug, c."contentType"
       FROM "Library" l JOIN "Content" c ON l."contentId" = c.id
       WHERE l."userId" = $1;`,
      [userId]
    );
    const readingProgress = await db.query(
      `SELECT r."pageNumber", r."percentCompleted", r."lastReadAt", c.title, ch.title as "chapterTitle"
       FROM "ReadingProgress" r
       JOIN "Content" c ON r."contentId" = c.id
       JOIN "Chapter" ch ON r."chapterId" = ch.id
       WHERE r."userId" = $1;`,
      [userId]
    );
    const listeningProgress = await db.query(
      `SELECT lp."positionSeconds", lp."percentCompleted", lp."lastListenedAt", c.title, ch.title as "chapterTitle"
       FROM "ListeningProgress" lp
       JOIN "Content" c ON lp."contentId" = c.id
       JOIN "Chapter" ch ON lp."chapterId" = ch.id
       WHERE lp."userId" = $1;`,
      [userId]
    );
    const bookmarks = await db.query(
      `SELECT b."pageNumber", b."audioPositionSeconds", b.note, b."createdAt", c.title, ch.title as "chapterTitle"
       FROM "Bookmark" b
       JOIN "Content" c ON b."contentId" = c.id
       JOIN "Chapter" ch ON b."chapterId" = ch.id
       WHERE b."userId" = $1;`,
      [userId]
    );
    const reviews = await db.query(
      `SELECT r.rating, r.title, r.body, r."createdAt", c.title as "contentTitle"
       FROM "Review" r JOIN "Content" c ON r."contentId" = c.id
       WHERE r."userId" = $1;`,
      [userId]
    );
    const orders = await db.query(
      `SELECT "orderNumber", "amountCents", currency, status, provider, "createdAt"
       FROM "Order" WHERE "userId" = $1;`,
      [userId]
    );
    const subscriptions = await db.query(
      `SELECT plan, status, "startDate", "expiryDate"
       FROM "Subscription" WHERE "userId" = $1;`,
      [userId]
    );

    await AuditService.log({
      userId,
      action: 'DATA_EXPORT_REQUESTED',
      resource: 'User',
      resourceId: userId,
    });

    return {
      exportedAt: new Date().toISOString(),
      userProfile: user,
      privacySettings: privacy,
      library,
      readingProgress,
      listeningProgress,
      bookmarks,
      reviews,
      orders,
      subscriptions,
    };
  }

  /**
   * Account Deletion & Anonymization Workflow:
   * Complies with legal and accounting retention policies while deleting PII.
   */
  static async deleteAccount(userId: string, reason?: string) {
    const user = await db.queryOne<{ id: string; email: string | null }>('SELECT id, email FROM "User" WHERE id = $1;', [userId]);
    if (!user) throw new AppError('NOT_FOUND', 'User not found.', 404);

    const anonymizedEmail = `deleted_${userId.slice(0, 8)}@anonymized.local`;
    const anonymizedName = 'Deleted User';

    await db.transaction(async (tx) => {
      // 1. Invalidate all active sessions
      await tx.execute('DELETE FROM "Session" WHERE "userId" = $1;', [userId]);

      // 2. Remove third-party identities
      await tx.execute('DELETE FROM "UserIdentity" WHERE "userId" = $1;', [userId]);

      // 3. Delete non-financial personal data
      await tx.execute('DELETE FROM "Bookmark" WHERE "userId" = $1;', [userId]);
      await tx.execute('DELETE FROM "ReadingProgress" WHERE "userId" = $1;', [userId]);
      await tx.execute('DELETE FROM "ListeningProgress" WHERE "userId" = $1;', [userId]);
      await tx.execute('DELETE FROM "Library" WHERE "userId" = $1;', [userId]);
      await tx.execute('DELETE FROM "Notification" WHERE "userId" = $1;', [userId]);

      // 4. Anonymize user record while keeping user ID intact for order/refund accounting
      await tx.execute(
        `UPDATE "User"
         SET email = $1,
             phone = NULL,
             name = $2,
             username = NULL,
             "passwordHash" = NULL,
             "avatarUrl" = NULL,
             status = 'DELETED',
             "emailVerified" = false,
             "phoneVerified" = false,
             "updatedAt" = NOW()
         WHERE id = $3;`,
        [anonymizedEmail, anonymizedName, userId]
      );
    });

    await AuditService.log({
      userId,
      action: 'ACCOUNT_DELETED_ANONYMIZED',
      resource: 'User',
      resourceId: userId,
      details: { reason: reason || 'User requested deletion' },
    });

    return { success: true, message: 'Your account and personal data have been anonymized and deleted.' };
  }
}
