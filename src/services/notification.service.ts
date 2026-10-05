import { db } from '@/lib/db';
import * as crypto from 'crypto';

export interface SendNotificationInput {
  userId: string;
  type:
    | 'NEW_CHAPTER'
    | 'NEW_AUDIOBOOK'
    | 'NEW_RELEASE'
    | 'PAYMENT_SUCCESS'
    | 'PAYMENT_FAILURE'
    | 'SUBSCRIPTION_EXPIRY'
    | 'SECURITY_ALERT'
    | 'NEW_LOGIN'
    | 'PASSWORD_CHANGE';
  title: string;
  message: string;
  linkUrl?: string;
}

export class NotificationService {
  /**
   * Dispatches an in-app notification according to user preferences.
   */
  static async send(input: SendNotificationInput) {
    const prefs = await db.queryOne<any>(
      'SELECT * FROM "NotificationPreferences" WHERE "userId" = $1;',
      [input.userId]
    );

    // If user disabled in-app notifications and it's not a security alert, skip
    if (prefs && !prefs.inAppNotifications && input.type !== 'SECURITY_ALERT') {
      return null;
    }

    const id = crypto.randomUUID();
    await db.execute(
      `INSERT INTO "Notification" (id, "userId", type, title, message, "linkUrl", "isRead", "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, false, NOW());`,
      [id, input.userId, input.type, input.title, input.message, input.linkUrl || null]
    );

    return { id, success: true };
  }

  /**
   * Retrieves user notifications with unread count.
   */
  static async getUserNotifications(userId: string, limit = 20) {
    const notifications = await db.query(
      `SELECT * FROM "Notification"
       WHERE "userId" = $1
       ORDER BY "createdAt" DESC
       LIMIT $2;`,
      [userId, limit]
    );

    const unreadRes = await db.queryOne<{ count: string }>(
      'SELECT COUNT(id) as count FROM "Notification" WHERE "userId" = $1 AND "isRead" = false;',
      [userId]
    );

    return {
      notifications,
      unreadCount: parseInt(unreadRes?.count || '0', 10),
    };
  }

  /**
   * Marks a single notification as read.
   */
  static async markAsRead(userId: string, notificationId: string) {
    await db.execute(
      'UPDATE "Notification" SET "isRead" = true WHERE id = $1 AND "userId" = $2;',
      [notificationId, userId]
    );
    return { success: true };
  }

  /**
   * Marks all notifications as read for a user.
   */
  static async markAllAsRead(userId: string) {
    await db.execute(
      'UPDATE "Notification" SET "isRead" = true WHERE "userId" = $1;',
      [userId]
    );
    return { success: true };
  }
}
