import { db } from '@/lib/db';
import { AppError } from '@/lib/api-response';
import * as crypto from 'crypto';

export class AuthorService {
  /**
   * Get Author profile with bibliography and follower count.
   */
  static async getAuthorBySlug(slug: string, currentUserId?: string) {
    const author = await db.queryOne<any>(
      `SELECT a.*,
              COUNT(DISTINCT af."userId")::int as "followerCount",
              COUNT(DISTINCT c.id)::int as "totalWorks"
       FROM "Author" a
       LEFT JOIN "AuthorFollower" af ON a.id = af."authorId"
       LEFT JOIN "Content" c ON a.id = c."authorId" AND c.status = 'PUBLISHED'
       WHERE a.slug = $1
       GROUP BY a.id;`,
      [slug]
    );

    if (!author) throw new AppError('NOT_FOUND', 'Author not found.', 404);

    const works = await db.query(
      `SELECT c.*,
              ARRAY_AGG(DISTINCT g.name) FILTER (WHERE g.name IS NOT NULL) as genres
       FROM "Content" c
       LEFT JOIN "ContentGenre" cg ON c.id = cg."contentId"
       LEFT JOIN "Genre" g ON cg."genreId" = g.id
       WHERE c."authorId" = $1 AND c.status = 'PUBLISHED'
       GROUP BY c.id
       ORDER BY c."viewCount" DESC;`,
      [author.id]
    );

    let isFollowing = false;
    if (currentUserId) {
      const follow = await db.queryOne(
        'SELECT 1 FROM "AuthorFollower" WHERE "userId" = $1 AND "authorId" = $2;',
        [currentUserId, author.id]
      );
      isFollowing = !!follow;
    }

    return {
      author,
      works,
      isFollowing,
    };
  }

  /**
   * Follow or Unfollow an Author.
   */
  static async toggleFollowAuthor(userId: string, authorId: string) {
    const existing = await db.queryOne<{ id: string }>(
      'SELECT id FROM "AuthorFollower" WHERE "userId" = $1 AND "authorId" = $2;',
      [userId, authorId]
    );

    if (existing) {
      await db.execute('DELETE FROM "AuthorFollower" WHERE id = $1;', [existing.id]);
      return { isFollowing: false };
    } else {
      await db.execute(
        `INSERT INTO "AuthorFollower" (id, "userId", "authorId", "createdAt")
         VALUES ($1, $2, $3, NOW());`,
        [crypto.randomUUID(), userId, authorId]
      );
      return { isFollowing: true };
    }
  }
}
