import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-context';
import { ReviewService } from '@/services/review.service';
import { apiSuccess, handleApiError } from '@/lib/api-response';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req);
    const body = await req.json().catch(() => ({}));
    const isHelpful = body.isHelpful !== undefined ? !!body.isHelpful : true;

    await ReviewService.voteHelpful(user.id, params.id, isHelpful);
    return apiSuccess({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
