import { db } from '@/lib/db';
import { AppError } from '@/lib/api-response';
import { AuditService } from './audit.service';
import * as crypto from 'crypto';

export interface CreateContentInput {
  title: string;
  slug: string;
  description: string;
  contentType: 'COMIC' | 'NOVEL' | 'SHORT_STORY' | 'AUDIOBOOK';
  authorId: string;
  artistName?: string;
  coverUrl: string;
  bannerUrl?: string;
  isPremium?: boolean;
  priceCents?: number;
  language?: string;
  genreIds?: string[];
}

export interface CreateChapterInput {
  contentId: string;
  chapterNumber: number;
  title: string;
  slug: string;
  isPremium?: boolean;
  priceCents?: number;
  // Comic pages
  pages?: Array<{ pageNumber: number; imageUrl: string; width?: number; height?: number }>;
  // Novel text
  novelText?: string;
  // Audiobook audio
  audioUrl?: string;
  audioDurationSeconds?: number;
}

export class AdminService {
  /**
   * Admin dashboard metrics & business statistics.
   */
  static async getDashboardMetrics() {
    const userStats = await db.queryOne<{ total: string; active: string; suspended: string }>(
      `SELECT
         COUNT(id)::int as total,
         COUNT(id) FILTER (WHERE status = 'ACTIVE')::int as active,
         COUNT(id) FILTER (WHERE status = 'SUSPENDED')::int as suspended
       FROM "User";`
    );

    const contentStats = await db.query(
      `SELECT "contentType", COUNT(id)::int as count
       FROM "Content"
       GROUP BY "contentType";`
    );

    const financialStats = await db.queryOne<{ revenue: string; totalOrders: string; successfulOrders: string }>(
      `SELECT
         COALESCE(SUM("amountCents") FILTER (WHERE status = 'SUCCESS'), 0)::bigint as revenue,
         COUNT(id)::int as "totalOrders",
         COUNT(id) FILTER (WHERE status = 'SUCCESS')::int as "successfulOrders"
       FROM "Order";`
    );

    const activeSubscriptions = await db.queryOne<{ count: string }>(
      `SELECT COUNT(id)::int as count
       FROM "Subscription"
       WHERE status = 'ACTIVE' AND ("expiryDate" IS NULL OR "expiryDate" > NOW());`
    );

    const recentOrders = await db.query(
      `SELECT o.id, o."orderNumber", o."amountCents", o.currency, o.status, o."createdAt", u.name as "userName", u.email as "userEmail"
       FROM "Order" o
       JOIN "User" u ON o."userId" = u.id
       ORDER BY o."createdAt" DESC
       LIMIT 8;`
    );

    const recentAuditLogs = await AuditService.getLogs(10, 0);

    return {
      users: {
        total: parseInt(userStats?.total || '0', 10),
        active: parseInt(userStats?.active || '0', 10),
        suspended: parseInt(userStats?.suspended || '0', 10),
      },
      contentByType: contentStats,
      revenue: {
        totalRevenueCents: parseInt(financialStats?.revenue || '0', 10),
        totalOrders: parseInt(financialStats?.totalOrders || '0', 10),
        successfulOrders: parseInt(financialStats?.successfulOrders || '0', 10),
      },
      activeSubscriptions: parseInt(activeSubscriptions?.count || '0', 10),
      recentOrders,
      recentAuditLogs,
    };
  }

  /**
   * Search and filter users.
   */
  static async getUsers(query?: string, role?: string, status?: string, limit = 25, offset = 0) {
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (query) {
      conditions.push(`(LOWER(email) LIKE $${idx} OR LOWER(name) LIKE $${idx} OR LOWER(username) LIKE $${idx})`);
      params.push(`%${query.toLowerCase()}%`);
      idx++;
    }

    if (role) {
      conditions.push(`role = $${idx}`);
      params.push(role);
      idx++;
    }

    if (status) {
      conditions.push(`status = $${idx}`);
      params.push(status);
      idx++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const users = await db.query(
      `SELECT id, email, phone, name, username, role, status, "emailVerified", "createdAt", "updatedAt"
       FROM "User"
       ${whereClause}
       ORDER BY "createdAt" DESC
       LIMIT $${idx} OFFSET $${idx + 1};`,
      [...params, limit, offset]
    );

    return users;
  }

  /**
   * Suspend or Restore user account.
   */
  static async updateUserStatus(userId: string, status: 'ACTIVE' | 'SUSPENDED', adminUserId: string) {
    await db.execute('UPDATE "User" SET status = $1, "updatedAt" = NOW() WHERE id = $2;', [status, userId]);

    if (status === 'SUSPENDED') {
      // Invalidate all active sessions for suspended user
      await db.execute('DELETE FROM "Session" WHERE "userId" = $1;', [userId]);
    }

    await AuditService.log({
      userId: adminUserId,
      action: status === 'SUSPENDED' ? 'USER_SUSPENDED' : 'USER_RESTORED',
      resource: 'User',
      resourceId: userId,
    });

    return { success: true };
  }

  /**
   * Create Content item (Comic, Novel, Story, or Audiobook).
   */
  static async createContent(input: CreateContentInput, adminUserId: string) {
    const id = crypto.randomUUID();
    const slug = input.slug.trim().toLowerCase();

    // Check slug uniqueness
    const existing = await db.queryOne('SELECT id FROM "Content" WHERE slug = $1;', [slug]);
    if (existing) throw new AppError('CONFLICT', 'Content with this slug already exists.');

    await db.transaction(async (tx) => {
      await tx.execute(
        `INSERT INTO "Content" (id, title, slug, description, "contentType", "authorId", "artistName", "coverUrl", "bannerUrl", status, "isPremium", "priceCents", language, "publishedAt", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PUBLISHED', $10, $11, $12, NOW(), NOW(), NOW());`,
        [
          id,
          input.title,
          slug,
          input.description,
          input.contentType,
          input.authorId,
          input.artistName || null,
          input.coverUrl,
          input.bannerUrl || null,
          !!input.isPremium,
          input.priceCents || 0,
          input.language || 'en',
        ]
      );

      // Link genres
      if (input.genreIds && input.genreIds.length > 0) {
        for (const genreId of input.genreIds) {
          await tx.execute(
            `INSERT INTO "ContentGenre" (id, "contentId", "genreId") VALUES ($1, $2, $3) ON CONFLICT DO NOTHING;`,
            [crypto.randomUUID(), id, genreId]
          );
        }
      }
    });

    await AuditService.log({
      userId: adminUserId,
      action: 'CONTENT_CREATED',
      resource: 'Content',
      resourceId: id,
      details: { title: input.title, type: input.contentType },
    });

    return { id, success: true };
  }

  /**
   * Create chapter with pages, text, or audio stream.
   */
  static async createChapter(input: CreateChapterInput, adminUserId: string) {
    const id = crypto.randomUUID();

    await db.transaction(async (tx) => {
      await tx.execute(
        `INSERT INTO "Chapter" (id, "contentId", "chapterNumber", title, slug, "isPremium", "priceCents", "publishedAt", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), NOW());`,
        [
          id,
          input.contentId,
          input.chapterNumber,
          input.title,
          input.slug,
          !!input.isPremium,
          input.priceCents || 0,
        ]
      );

      // Add Comic Pages
      if (input.pages && input.pages.length > 0) {
        for (const page of input.pages) {
          await tx.execute(
            `INSERT INTO "ComicPage" (id, "chapterId", "pageNumber", "imageUrl", width, height, "createdAt")
             VALUES ($1, $2, $3, $4, $5, $6, NOW());`,
            [crypto.randomUUID(), id, page.pageNumber, page.imageUrl, page.width || null, page.height || null]
          );
        }
      }

      // Add Novel text
      if (input.novelText) {
        await tx.execute(
          `INSERT INTO "NovelChapterContent" (id, "chapterId", "textContent", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, NOW(), NOW());`,
          [crypto.randomUUID(), id, input.novelText]
        );
      }

      // Add Audio chapter
      if (input.audioUrl) {
        await tx.execute(
          `INSERT INTO "AudioChapter" (id, "chapterId", "audioUrl", "durationSeconds", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, NOW(), NOW());`,
          [crypto.randomUUID(), id, input.audioUrl, input.audioDurationSeconds || 0]
        );
      }
    });

    await AuditService.log({
      userId: adminUserId,
      action: 'CHAPTER_CREATED',
      resource: 'Chapter',
      resourceId: id,
      details: { contentId: input.contentId, chapterNumber: input.chapterNumber },
    });

    return { id, success: true };
  }
}
