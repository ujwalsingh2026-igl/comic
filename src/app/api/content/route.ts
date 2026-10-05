import { NextRequest } from 'next/server';
import { ContentService } from '@/services/content.service';
import { apiSuccess, handleApiError } from '@/lib/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const query = url.searchParams.get('q') || undefined;
    const contentType = (url.searchParams.get('type') as any) || undefined;
    const genreSlug = url.searchParams.get('genre') || undefined;
    const language = url.searchParams.get('lang') || undefined;
    const isPremium = url.searchParams.get('premium') !== null
      ? url.searchParams.get('premium') === 'true'
      : undefined;
    const minRating = url.searchParams.get('minRating')
      ? parseFloat(url.searchParams.get('minRating')!)
      : undefined;
    const releaseStatus = (url.searchParams.get('status') as any) || undefined;
    const sortBy = (url.searchParams.get('sort') as any) || 'relevance';
    const page = url.searchParams.get('page') ? parseInt(url.searchParams.get('page')!, 10) : 1;
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!, 10) : 16;

    const result = await ContentService.search({
      query,
      contentType,
      genreSlug,
      language,
      isPremium,
      minRating,
      releaseStatus,
      sortBy,
      page,
      limit,
    });

    return apiSuccess(result);
  } catch (err) {
    return handleApiError(err);
  }
}
