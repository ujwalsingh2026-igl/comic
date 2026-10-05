import { db } from '@/lib/db';
import { AppError } from '@/lib/api-response';
import * as crypto from 'crypto';

export interface SaveReadingProgressInput {
  userId: string;
  contentId: string;
  chapterId: string;
  pageNumber?: number;
  scrollPosition?: number;
  percentCompleted?: number;
}

export interface SaveListeningProgressInput {
  userId: string;
  contentId: string;
  chapterId: string;
  positionSeconds: number;
  durationSeconds: number;
  percentCompleted?: number;
}

export interface BookmarkInput {
  userId: string;
  contentId: string;
  chapterId: string;
  pageNumber?: number;
  audioPositionSeconds?: number;
  note?: string;
}

export class ReadingService {
  /**
   * Save or update comic/novel reading progress.
   */
  static async saveReadingProgress(input: SaveReadingProgressInput) {
    const pageNumber = input.pageNumber || 1;
    const scrollPosition = input.scrollPosition || 0;
    const percentCompleted = Math.min(100, Math.max(0, input.percentCompleted || 0));

    // Check if progress record exists
    const existing = await db.queryOne<{ id: string }>(
      'SELECT id FROM "ReadingProgress" WHERE "userId" = $1 AND "contentId" = $2;',
      [input.userId, input.contentId]
    );

    if (existing) {
      await db.execute(
        `UPDATE "ReadingProgress"
         SET "chapterId" = $1, "pageNumber" = $2, "scrollPosition" = $3, "percentCompleted" = $4, "lastReadAt" = NOW(), "updatedAt" = NOW()
         WHERE id = $5;`,
        [input.chapterId, pageNumber, scrollPosition, percentCompleted, existing.id]
      );
    } else {
      await db.execute(
        `INSERT INTO "ReadingProgress" (id, "userId", "contentId", "chapterId", "pageNumber", "scrollPosition", "percentCompleted", "lastReadAt", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), NOW());`,
        [crypto.randomUUID(), input.userId, input.contentId, input.chapterId, pageNumber, scrollPosition, percentCompleted]
      );
    }

    // Also auto-add or keep in Library under CURRENTLY_READING
    const inLibrary = await db.queryOne<{ id: string; shelf: string }>(
      'SELECT id, shelf FROM "Library" WHERE "userId" = $1 AND "contentId" = $2;',
      [input.userId, input.contentId]
    );

    if (!inLibrary) {
      await db.execute(
        `INSERT INTO "Library" (id, "userId", "contentId", shelf, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, 'CURRENTLY_READING', NOW(), NOW());`,
        [crypto.randomUUID(), input.userId, input.contentId]
      );
    } else if (percentCompleted >= 98 && inLibrary.shelf !== 'COMPLETED') {
      await db.execute(
        `UPDATE "Library" SET shelf = 'COMPLETED', "updatedAt" = NOW() WHERE id = $1;`,
        [inLibrary.id]
      );
    }

    return { success: true };
  }

  /**
   * Save or update audiobook listening progress.
   */
  static async saveListeningProgress(input: SaveListeningProgressInput) {
    const position = Math.max(0, input.positionSeconds);
    const duration = Math.max(1, input.durationSeconds);
    const percent = Math.min(100, Math.max(0, input.percentCompleted || (position / duration) * 100));

    const existing = await db.queryOne<{ id: string }>(
      'SELECT id FROM "ListeningProgress" WHERE "userId" = $1 AND "contentId" = $2;',
      [input.userId, input.contentId]
    );

    if (existing) {
      await db.execute(
        `UPDATE "ListeningProgress"
         SET "chapterId" = $1, "positionSeconds" = $2, "durationSeconds" = $3, "percentCompleted" = $4, "lastListenedAt" = NOW(), "updatedAt" = NOW()
         WHERE id = $5;`,
        [input.chapterId, position, duration, percent, existing.id]
      );
    } else {
      await db.execute(
        `INSERT INTO "ListeningProgress" (id, "userId", "contentId", "chapterId", "positionSeconds", "durationSeconds", "percentCompleted", "lastListenedAt", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), NOW());`,
        [crypto.randomUUID(), input.userId, input.contentId, input.chapterId, position, duration, percent]
      );
    }

    return { success: true };
  }

  /**
   * Resume reading or listening for specific content.
   */
  static async getResumeProgress(userId: string, contentId: string) {
    const reading = await db.queryOne<any>(
      `SELECT rp.*, ch."chapterNumber", ch.title as "chapterTitle", ch.slug as "chapterSlug"
       FROM "ReadingProgress" rp
       JOIN "Chapter" ch ON rp."chapterId" = ch.id
       WHERE rp."userId" = $1 AND rp."contentId" = $2;`,
      [userId, contentId]
    );

    const listening = await db.queryOne<any>(
      `SELECT lp.*, ch."chapterNumber", ch.title as "chapterTitle", ch.slug as "chapterSlug"
       FROM "ListeningProgress" lp
       JOIN "Chapter" ch ON lp."chapterId" = ch.id
       WHERE lp."userId" = $1 AND lp."contentId" = $2;`,
      [userId, contentId]
    );

    return { reading, listening };
  }

  /**
   * Add or update content in user Library.
   */
  static async updateLibraryShelf(userId: string, contentId: string, shelf: 'CURRENTLY_READING' | 'COMPLETED' | 'SAVED' | 'PURCHASED') {
    const existing = await db.queryOne<{ id: string }>(
      'SELECT id FROM "Library" WHERE "userId" = $1 AND "contentId" = $2;',
      [userId, contentId]
    );

    if (existing) {
      await db.execute(
        'UPDATE "Library" SET shelf = $1, "updatedAt" = NOW() WHERE id = $2;',
        [shelf, existing.id]
      );
    } else {
      await db.execute(
        `INSERT INTO "Library" (id, "userId", "contentId", shelf, "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, NOW(), NOW());`,
        [crypto.randomUUID(), userId, contentId, shelf]
      );
    }

    return { success: true, shelf };
  }

  /**
   * Remove item from user Library.
   */
  static async removeFromLibrary(userId: string, contentId: string) {
    await db.execute('DELETE FROM "Library" WHERE "userId" = $1 AND "contentId" = $2;', [userId, contentId]);
    return { success: true };
  }

  /**
   * Get user library items with shelf filtering.
   */
  static async getUserLibrary(userId: string, shelf?: string) {
    let where = 'l."userId" = $1';
    const params: any[] = [userId];

    if (shelf) {
      where += ' AND l.shelf = $2';
      params.push(shelf);
    }

    return db.query(
      `SELECT l.id, l.shelf, l."createdAt", l."updatedAt",
              c.id as "contentId", c.title, c.slug, c."contentType", c."coverUrl", c."ratingAverage",
              a.name as "authorName",
              rp."percentCompleted" as "readingPercent",
              lp."percentCompleted" as "listeningPercent"
       FROM "Library" l
       JOIN "Content" c ON l."contentId" = c.id
       JOIN "Author" a ON c."authorId" = a.id
       LEFT JOIN "ReadingProgress" rp ON rp."userId" = $1 AND rp."contentId" = c.id
       LEFT JOIN "ListeningProgress" lp ON lp."userId" = $1 AND lp."contentId" = c.id
       WHERE ${where}
       ORDER BY l."updatedAt" DESC;`,
      params
    );
  }

  /**
   * Create Bookmark.
   */
  static async createBookmark(input: BookmarkInput) {
    const id = crypto.randomUUID();
    await db.execute(
      `INSERT INTO "Bookmark" (id, "userId", "contentId", "chapterId", "pageNumber", "audioPositionSeconds", note, "createdAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW());`,
      [
        id,
        input.userId,
        input.contentId,
        input.chapterId,
        input.pageNumber || null,
        input.audioPositionSeconds || null,
        input.note || null,
      ]
    );
    return { id, success: true };
  }

  /**
   * Get bookmarks for user or specific content.
   */
  static async getBookmarks(userId: string, contentId?: string) {
    let where = 'b."userId" = $1';
    const params: any[] = [userId];

    if (contentId) {
      where += ' AND b."contentId" = $2';
      params.push(contentId);
    }

    return db.query(
      `SELECT b.*, c.title as "contentTitle", c.slug as "contentSlug", c."contentType",
              ch.title as "chapterTitle", ch."chapterNumber"
       FROM "Bookmark" b
       JOIN "Content" c ON b."contentId" = c.id
       JOIN "Chapter" ch ON b."chapterId" = ch.id
       WHERE ${where}
       ORDER BY b."createdAt" DESC;`,
      params
    );
  }

  /**
   * Delete Bookmark.
   */
  static async deleteBookmark(userId: string, bookmarkId: string) {
    const res = await db.execute('DELETE FROM "Bookmark" WHERE id = $1 AND "userId" = $2;', [bookmarkId, userId]);
    if (res === 0) throw new AppError('NOT_FOUND', 'Bookmark not found or unauthorized.', 404);
    return { success: true };
  }

  /**
   * Reading History list.
   */
  static async getReadingHistory(userId: string) {
    return db.query(
      `SELECT rp.id, rp."pageNumber", rp."percentCompleted", rp."lastReadAt",
              c.id as "contentId", c.title, c.slug, c."contentType", c."coverUrl",
              ch."chapterNumber", ch.title as "chapterTitle",
              a.name as "authorName"
       FROM "ReadingProgress" rp
       JOIN "Content" c ON rp."contentId" = c.id
       JOIN "Chapter" ch ON rp."chapterId" = ch.id
       JOIN "Author" a ON c."authorId" = a.id
       WHERE rp."userId" = $1
       ORDER BY rp."lastReadAt" DESC;`,
      [userId]
    );
  }

  /**
   * Clear user reading history.
   */
  static async clearReadingHistory(userId: string) {
    await db.execute('DELETE FROM "ReadingProgress" WHERE "userId" = $1;', [userId]);
    await db.execute('DELETE FROM "ListeningProgress" WHERE "userId" = $1;', [userId]);
    return { success: true };
  }
}
