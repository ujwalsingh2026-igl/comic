import { NextRequest } from 'next/server';
import { requireAuth, getOptionalUser } from '@/lib/auth-context';
import { ReviewService } from '@/services/review.service';
import { apiSuccess, handleApiError } from '@/lib/api-response';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getOptionalUser(req);
    const url = new URL(req.url);
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!, 10) : 20;
    const offset = url.searchParams.get('offset') ? parseInt(url.searchParams.get('offset')!, 10) : 0;

    const reviews = await ReviewService.getContentReviews(params.id, limit, offset, user?.id);
    return apiSuccess(reviews);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req);
    const isAdmin = user.role === 'ADMIN' || user.role === 'SUPER_ADMIN';
    await ReviewService.deleteReview(user.id, params.id, isAdmin);
    return apiSuccess({ success: true }, 'Review deleted.');
  } catch (err) {
    return handleApiError(err);
  }
}
