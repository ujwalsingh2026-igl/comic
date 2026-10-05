import { db } from '@/lib/db';
import { sanitizeString, checkRateLimit } from '@/lib/security';
import { AppError } from '@/lib/api-response';
import * as crypto from 'crypto';

export interface PostReviewInput {
  userId: string;
  contentId: string;
  rating: number;
  title?: string;
  body: string;
  isSpoiler?: boolean;
}

export class ReviewService {
  /**
   * Post or update a review.
   */
  static async postReview(input: PostReviewInput) {
    // 1. Validate rating
    const rating = Math.round(input.rating);
    if (rating < 1 || rating > 5) {
      throw new AppError('VALIDATION_ERROR', 'Rating must be an integer between 1 and 5.');
    }

    const body = input.body.trim();
    if (body.length < 5 || body.length > 2000) {
      throw new AppError('VALIDATION_ERROR', 'Review body must be between 5 and 2000 characters.');
    }

    // Rate limit review posts per user (max 5 per 10 mins)
    const rl = checkRateLimit(`review:${input.userId}`, 5, 600);
    if (!rl.allowed) {
      throw new AppError('RATE_LIMITED', 'Too many reviews posted recently. Please wait a bit.', 429);
    }

    const cleanTitle = input.title ? sanitizeString(input.title.trim().slice(0, 100)) : null;
    const cleanBody = sanitizeString(body);

    const existing = await db.queryOne<{ id: string }>(
      'SELECT id FROM "Review" WHERE "userId" = $1 AND "contentId" = $2;',
      [input.userId, input.contentId]
    );

    let reviewId = existing?.id;

    await db.transaction(async (tx) => {
      if (existing) {
        await tx.execute(
          `UPDATE "Review"
           SET rating = $1, title = $2, body = $3, "isSpoiler" = $4, "updatedAt" = NOW()
           WHERE id = $5;`,
          [rating, cleanTitle, cleanBody, !!input.isSpoiler, existing.id]
        );
      } else {
        reviewId = crypto.randomUUID();
        await tx.execute(
          `INSERT INTO "Review" (id, "userId", "contentId", rating, title, body, "isSpoiler", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW());`,
          [reviewId, input.userId, input.contentId, rating, cleanTitle, cleanBody, !!input.isSpoiler]
        );
      }

      // Recalculate content average rating and count
      const stats = await tx.queryOne<{ avg: string; count: string }>(
        'SELECT AVG(rating)::numeric(3,2) as avg, COUNT(id) as count FROM "Review" WHERE "contentId" = $1;',
        [input.contentId]
      );

      const avg = stats ? parseFloat(stats.avg) : rating;
      const count = stats ? parseInt(stats.count, 10) : 1;

      await tx.execute(
        'UPDATE "Content" SET "ratingAverage" = $1, "ratingCount" = $2, "updatedAt" = NOW() WHERE id = $3;',
        [avg, count, input.contentId]
      );
    });

    return { success: true, reviewId };
  }

  /**
   * Get reviews for content with user info and helpful vote counts.
   */
  static async getContentReviews(contentId: string, limit = 20, offset = 0, currentUserId?: string) {
    return db.query(
      `SELECT r.id, r.rating, r.title, r.body, r."isSpoiler", r."createdAt",
              u.id as "userId", u.name as "userName", u."avatarUrl" as "userAvatar",
              COUNT(v.id) FILTER (WHERE v."isHelpful" = true)::int as "helpfulCount",
              CASE WHEN $4::text IS NOT NULL AND EXISTS(
                SELECT 1 FROM "ReviewHelpfulVote" hv WHERE hv."reviewId" = r.id AND hv."userId" = $4
              ) THEN true ELSE false END as "userHasVoted"
       FROM "Review" r
       JOIN "User" u ON r."userId" = u.id
       LEFT JOIN "ReviewHelpfulVote" v ON r.id = v."reviewId"
       WHERE r."contentId" = $1 AND r."isApproved" = true
       GROUP BY r.id, u.id
       ORDER BY "helpfulCount" DESC, r."createdAt" DESC
       LIMIT $2 OFFSET $3;`,
      [contentId, limit, offset, currentUserId || null]
    );
  }

  /**
   * Vote a review as helpful.
   */
  static async voteHelpful(userId: string, reviewId: string, isHelpful = true) {
    const existing = await db.queryOne<{ id: string }>(
      'SELECT id FROM "ReviewHelpfulVote" WHERE "userId" = $1 AND "reviewId" = $2;',
      [userId, reviewId]
    );

    if (existing) {
      await db.execute(
        'UPDATE "ReviewHelpfulVote" SET "isHelpful" = $1 WHERE id = $2;',
        [isHelpful, existing.id]
      );
    } else {
      await db.execute(
        `INSERT INTO "ReviewHelpfulVote" (id, "userId", "reviewId", "isHelpful", "createdAt")
         VALUES ($1, $2, $3, $4, NOW());`,
        [crypto.randomUUID(), userId, reviewId, isHelpful]
      );
    }

    return { success: true };
  }

  /**
   * Delete a review.
   */
  static async deleteReview(userId: string, reviewId: string, isAdmin = false) {
    const review = await db.queryOne<any>('SELECT * FROM "Review" WHERE id = $1;', [reviewId]);
    if (!review) throw new AppError('NOT_FOUND', 'Review not found.', 404);

    if (review.userId !== userId && !isAdmin) {
      throw new AppError('FORBIDDEN', 'You cannot delete this review.', 403);
    }

    await db.transaction(async (tx) => {
      await tx.execute('DELETE FROM "ReviewHelpfulVote" WHERE "reviewId" = $1;', [reviewId]);
      await tx.execute('DELETE FROM "Review" WHERE id = $1;', [reviewId]);

      // Recalculate rating
      const stats = await tx.queryOne<{ avg: string; count: string }>(
        'SELECT AVG(rating)::numeric(3,2) as avg, COUNT(id) as count FROM "Review" WHERE "contentId" = $1;',
        [review.contentId]
      );

      const avg = stats && stats.avg ? parseFloat(stats.avg) : 0;
      const count = stats && stats.count ? parseInt(stats.count, 10) : 0;

      await tx.execute(
        'UPDATE "Content" SET "ratingAverage" = $1, "ratingCount" = $2, "updatedAt" = NOW() WHERE id = $3;',
        [avg, count, review.contentId]
      );
    });

    return { success: true };
  }
}
