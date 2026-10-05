import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-context';
import { ReviewService } from '@/services/review.service';
import { apiSuccess, handleApiError } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();

    const result = await ReviewService.postReview({
      userId: user.id,
      contentId: body.contentId,
      rating: body.rating,
      title: body.title,
      body: body.body,
      isSpoiler: body.isSpoiler,
    });

    return apiSuccess(result, 'Review published successfully.');
  } catch (err) {
    return handleApiError(err);
  }
}
