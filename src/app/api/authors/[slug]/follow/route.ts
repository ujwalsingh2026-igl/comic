import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-context';
import { AuthorService } from '@/services/author.service';
import { db } from '@/lib/db';
import { apiSuccess, handleApiError, AppError } from '@/lib/api-response';

export async function POST(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const user = await requireAuth(req);
    // Find author by slug or id
    const author = await db.queryOne<{ id: string }>(
      'SELECT id FROM "Author" WHERE slug = $1 OR id = $1;',
      [params.slug]
    );

    if (!author) throw new AppError('NOT_FOUND', 'Author not found.', 404);

    const result = await AuthorService.toggleFollowAuthor(user.id, author.id);
    return apiSuccess(result);
  } catch (err) {
    return handleApiError(err);
  }
}
