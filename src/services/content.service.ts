import { db } from '@/lib/db';
import { AppError } from '@/lib/api-response';

export interface ContentFilterOptions {
  query?: string;
  contentType?: 'COMIC' | 'NOVEL' | 'SHORT_STORY' | 'AUDIOBOOK';
  genreSlug?: string;
  language?: string;
  isPremium?: boolean;
  minRating?: number;
  releaseStatus?: 'ONGOING' | 'COMPLETED';
  sortBy?: 'relevance' | 'newest' | 'popular' | 'rating';
  page?: number;
  limit?: number;
}

export class ContentService {
  /**
   * Homepage discovery feed: featured, trending comics, novels, audiobooks, new releases.
   */
  static async getHomeFeed() {
    const featured = await db.query(
      `SELECT c.*, a.name as "authorName", a.slug as "authorSlug"
       FROM "Content" c
       JOIN "Author" a ON c."authorId" = a.id
       WHERE c.status = 'PUBLISHED'
       ORDER BY c."viewCount" DESC, c."ratingAverage" DESC
       LIMIT 5;`
    );

    const trendingComics = await db.query(
      `SELECT c.*, a.name as "authorName"
       FROM "Content" c JOIN "Author" a ON c."authorId" = a.id
       WHERE c.status = 'PUBLISHED' AND c."contentType" = 'COMIC'
       ORDER BY c."viewCount" DESC
       LIMIT 8;`
    );

    const popularNovels = await db.query(
      `SELECT c.*, a.name as "authorName"
       FROM "Content" c JOIN "Author" a ON c."authorId" = a.id
       WHERE c.status = 'PUBLISHED' AND c."contentType" = 'NOVEL'
       ORDER BY c."viewCount" DESC
       LIMIT 8;`
    );

    const popularAudiobooks = await db.query(
      `SELECT c.*, a.name as "authorName", ab.narrator, ab."totalDurationSeconds"
       FROM "Content" c
       JOIN "Author" a ON c."authorId" = a.id
       LEFT JOIN "Audiobook" ab ON c.id = ab."contentId"
       WHERE c.status = 'PUBLISHED' AND c."contentType" = 'AUDIOBOOK'
       ORDER BY c."viewCount" DESC
       LIMIT 8;`
    );

    const newReleases = await db.query(
      `SELECT c.*, a.name as "authorName"
       FROM "Content" c JOIN "Author" a ON c."authorId" = a.id
       WHERE c.status = 'PUBLISHED'
       ORDER BY c."publishedAt" DESC
       LIMIT 8;`
    );

    const genres = await db.query(
      `SELECT g.*, COUNT(cg."contentId")::int as "contentCount"
       FROM "Genre" g
       LEFT JOIN "ContentGenre" cg ON g.id = cg."genreId"
       GROUP BY g.id
       ORDER BY "contentCount" DESC
       LIMIT 10;`
    );

    const popularAuthors = await db.query(
      `SELECT a.*, COUNT(c.id)::int as "contentCount"
       FROM "Author" a
       LEFT JOIN "Content" c ON a.id = c."authorId"
       GROUP BY a.id
       ORDER BY "contentCount" DESC
       LIMIT 6;`
    );

    return {
      featured,
      trendingComics,
      popularNovels,
      popularAudiobooks,
      newReleases,
      genres,
      popularAuthors,
    };
  }

  /**
   * Global search and discovery with filtering, sorting, and pagination.
   */
  static async search(options: ContentFilterOptions) {
    const page = Math.max(1, options.page || 1);
    const limit = Math.min(50, Math.max(1, options.limit || 16));
    const offset = (page - 1) * limit;

    const conditions: string[] = ["c.status = 'PUBLISHED'"];
    const params: any[] = [];
    let idx = 1;

    if (options.query && options.query.trim().length > 0) {
      const q = `%${options.query.trim().toLowerCase()}%`;
      conditions.push(`(LOWER(c.title) LIKE $${idx} OR LOWER(c.description) LIKE $${idx} OR LOWER(a.name) LIKE $${idx})`);
      params.push(q);
      idx++;
    }

    if (options.contentType) {
      conditions.push(`c."contentType" = $${idx}`);
      params.push(options.contentType);
      idx++;
    }

    if (options.language) {
      conditions.push(`c.language = $${idx}`);
      params.push(options.language);
      idx++;
    }

    if (options.isPremium !== undefined) {
      conditions.push(`c."isPremium" = $${idx}`);
      params.push(options.isPremium);
      idx++;
    }

    if (options.minRating !== undefined && options.minRating > 0) {
      conditions.push(`c."ratingAverage" >= $${idx}`);
      params.push(options.minRating);
      idx++;
    }

    if (options.releaseStatus) {
      conditions.push(`c."releaseStatus" = $${idx}`);
      params.push(options.releaseStatus);
      idx++;
    }

    if (options.genreSlug) {
      conditions.push(`EXISTS (
        SELECT 1 FROM "ContentGenre" cg
        JOIN "Genre" g ON cg."genreId" = g.id
        WHERE cg."contentId" = c.id AND g.slug = $${idx}
      )`);
      params.push(options.genreSlug);
      idx++;
    }

    let orderBy = 'c."viewCount" DESC';
    if (options.sortBy === 'newest') orderBy = 'c."publishedAt" DESC NULLS LAST';
    else if (options.sortBy === 'popular') orderBy = 'c."viewCount" DESC';
    else if (options.sortBy === 'rating') orderBy = 'c."ratingAverage" DESC';

    const whereClause = conditions.join(' AND ');

    // Total count query
    const countRes = await db.queryOne<{ count: string }>(
      `SELECT COUNT(DISTINCT c.id) as count
       FROM "Content" c
       JOIN "Author" a ON c."authorId" = a.id
       WHERE ${whereClause};`,
      params
    );
    const totalCount = parseInt(countRes?.count || '0', 10);

    // Items query
    const itemsQuery = `
      SELECT c.*, a.name as "authorName", a.slug as "authorSlug",
             ARRAY_AGG(DISTINCT g.name) FILTER (WHERE g.name IS NOT NULL) as genres
      FROM "Content" c
      JOIN "Author" a ON c."authorId" = a.id
      LEFT JOIN "ContentGenre" cg ON c.id = cg."contentId"
      LEFT JOIN "Genre" g ON cg."genreId" = g.id
      WHERE ${whereClause}
      GROUP BY c.id, a.id
      ORDER BY ${orderBy}
      LIMIT $${idx} OFFSET $${idx + 1};
    `;

    params.push(limit, offset);
    const items = await db.query(itemsQuery, params);

    return {
      items,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  /**
   * Fetches content by slug with author, genres, and published chapters.
   */
  static async getContentBySlug(slug: string, currentUserId?: string) {
    const content = await db.queryOne<any>(
      `SELECT c.*, a.name as "authorName", a.slug as "authorSlug", a.bio as "authorBio", a."avatarUrl" as "authorAvatar",
              ab.narrator, ab."totalDurationSeconds", ab."sampleAudioUrl"
       FROM "Content" c
       JOIN "Author" a ON c."authorId" = a.id
       LEFT JOIN "Audiobook" ab ON c.id = ab."contentId"
       WHERE c.slug = $1 AND c.status = 'PUBLISHED';`,
      [slug]
    );

    if (!content) throw new AppError('NOT_FOUND', 'Content not found.', 404);

    // Fetch genres
    const genres = await db.query(
      `SELECT g.* FROM "Genre" g
       JOIN "ContentGenre" cg ON g.id = cg."genreId"
       WHERE cg."contentId" = $1;`,
      [content.id]
    );

    // Fetch chapters list
    const chapters = await db.query(
      `SELECT id, "chapterNumber", title, slug, "isPremium", "priceCents", "wordCount", "publishedAt"
       FROM "Chapter"
       WHERE "contentId" = $1
       ORDER BY "chapterNumber" ASC;`,
      [content.id]
    );

    // Check user entitlements and library status if logged in
    let hasAccess = !content.isPremium;
    let isInLibrary = false;
    let libraryShelf = null;
    let userProgress = null;

    if (currentUserId) {
      // Check subscription or purchase entitlement
      if (content.isPremium) {
        const entitlement = await db.queryOne(
          `SELECT 1 FROM "Entitlement"
           WHERE "userId" = $1 AND ("contentId" = $2 OR "contentId" IS NULL)
           AND ("expiresAt" IS NULL OR "expiresAt" > NOW());`,
          [currentUserId, content.id]
        );
        hasAccess = !!entitlement;
      }

      const lib = await db.queryOne<any>(
        'SELECT shelf FROM "Library" WHERE "userId" = $1 AND "contentId" = $2;',
        [currentUserId, content.id]
      );
      if (lib) {
        isInLibrary = true;
        libraryShelf = lib.shelf;
      }

      if (content.contentType === 'AUDIOBOOK') {
        userProgress = await db.queryOne(
          'SELECT * FROM "ListeningProgress" WHERE "userId" = $1 AND "contentId" = $2;',
          [currentUserId, content.id]
        );
      } else {
        userProgress = await db.queryOne(
          'SELECT * FROM "ReadingProgress" WHERE "userId" = $1 AND "contentId" = $2;',
          [currentUserId, content.id]
        );
      }
    }

    // Increment view count asynchronously
    db.execute('UPDATE "Content" SET "viewCount" = "viewCount" + 1 WHERE id = $1;', [content.id]).catch(() => {});

    return {
      content,
      genres,
      chapters,
      userState: {
        hasAccess,
        isInLibrary,
        libraryShelf,
        progress: userProgress,
      },
    };
  }

  /**
   * Fetches chapter content with strict authorization and entitlement checking.
   */
  static async getChapterContent(contentSlug: string, chapterNumber: number, currentUserId?: string) {
    const chapter = await db.queryOne<any>(
      `SELECT ch.*, c.title as "contentTitle", c.slug as "contentSlug", c."contentType", c."isPremium" as "contentIsPremium"
       FROM "Chapter" ch
       JOIN "Content" c ON ch."contentId" = c.id
       WHERE c.slug = $1 AND ch."chapterNumber" = $2 AND c.status = 'PUBLISHED';`,
      [contentSlug, chapterNumber]
    );

    if (!chapter) throw new AppError('NOT_FOUND', 'Chapter not found.', 404);

    // Authorization check for premium content or chapter
    const requiresEntitlement = chapter.contentIsPremium || chapter.isPremium;
    if (requiresEntitlement) {
      if (!currentUserId) {
        throw new AppError('PAYMENT_REQUIRED', 'This chapter requires an active subscription or purchase.', 402);
      }

      // Check user entitlement
      const hasEntitlement = await db.queryOne(
        `SELECT 1 FROM "Entitlement"
         WHERE "userId" = $1
           AND ("contentId" = $2 OR "chapterId" = $3 OR ("contentId" IS NULL AND "chapterId" IS NULL))
           AND ("expiresAt" IS NULL OR "expiresAt" > NOW());`,
        [currentUserId, chapter.contentId, chapter.id]
      );

      if (!hasEntitlement) {
        throw new AppError('PAYMENT_REQUIRED', 'Please purchase this content or upgrade your subscription to read.', 402);
      }
    }

    // Return chapter payload based on content type
    let data: any = {};

    if (chapter.contentType === 'COMIC') {
      const pages = await db.query(
        `SELECT id, "pageNumber", "imageUrl", width, height
         FROM "ComicPage"
         WHERE "chapterId" = $1
         ORDER BY "pageNumber" ASC;`,
        [chapter.id]
      );
      data.pages = pages;
    } else if (chapter.contentType === 'NOVEL' || chapter.contentType === 'SHORT_STORY') {
      const novelContent = await db.queryOne<any>(
        'SELECT "textContent" FROM "NovelChapterContent" WHERE "chapterId" = $1;',
        [chapter.id]
      );
      data.textContent = novelContent?.textContent || '';
    } else if (chapter.contentType === 'AUDIOBOOK') {
      const audio = await db.queryOne<any>(
        'SELECT "audioUrl", "durationSeconds", "bitRate" FROM "AudioChapter" WHERE "chapterId" = $1;',
        [chapter.id]
      );
      data.audio = audio;
    }

    // Previous and Next chapter navigation links
    const prevChapter = await db.queryOne<any>(
      `SELECT "chapterNumber", title FROM "Chapter"
       WHERE "contentId" = $1 AND "chapterNumber" < $2
       ORDER BY "chapterNumber" DESC LIMIT 1;`,
      [chapter.contentId, chapterNumber]
    );

    const nextChapter = await db.queryOne<any>(
      `SELECT "chapterNumber", title FROM "Chapter"
       WHERE "contentId" = $1 AND "chapterNumber" > $2
       ORDER BY "chapterNumber" ASC LIMIT 1;`,
      [chapter.contentId, chapterNumber]
    );

    return {
      chapter,
      ...data,
      navigation: {
        prev: prevChapter ? { chapterNumber: prevChapter.chapterNumber, title: prevChapter.title } : null,
        next: nextChapter ? { chapterNumber: nextChapter.chapterNumber, title: nextChapter.title } : null,
      },
    };
  }
}
