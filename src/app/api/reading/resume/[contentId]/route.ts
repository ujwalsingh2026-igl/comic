import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-context';
import { ReadingService } from '@/services/reading.service';
import { apiSuccess, handleApiError } from '@/lib/api-response';

export async function GET(
  req: NextRequest,
  { params }: { params: { contentId: string } }
) {
  try {
    const user = await requireAuth(req);
    const progress = await ReadingService.getResumeProgress(user.id, params.contentId);
    return apiSuccess(progress);
  } catch (err) {
    return handleApiError(err);
  }
}
