import { NextRequest } from 'next/server';
import { ContentService } from '@/services/content.service';
import { getOptionalUser } from '@/lib/auth-context';
import { apiSuccess, handleApiError } from '@/lib/api-response';

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const user = await getOptionalUser(req);
    const result = await ContentService.getContentBySlug(params.slug, user?.id);
    return apiSuccess(result);
  } catch (err) {
    return handleApiError(err);
  }
}
