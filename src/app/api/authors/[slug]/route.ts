import { NextRequest } from 'next/server';
import { AuthorService } from '@/services/author.service';
import { getOptionalUser } from '@/lib/auth-context';
import { apiSuccess, handleApiError } from '@/lib/api-response';

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const user = await getOptionalUser(req);
    const authorData = await AuthorService.getAuthorBySlug(params.slug, user?.id);
    return apiSuccess(authorData);
  } catch (err) {
    return handleApiError(err);
  }
}
