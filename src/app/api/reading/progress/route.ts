import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-context';
import { ReadingService } from '@/services/reading.service';
import { apiSuccess, handleApiError } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();

    if (body.type === 'AUDIO') {
      await ReadingService.saveListeningProgress({
        userId: user.id,
        contentId: body.contentId,
        chapterId: body.chapterId,
        positionSeconds: body.positionSeconds,
        durationSeconds: body.durationSeconds,
        percentCompleted: body.percentCompleted,
      });
    } else {
      await ReadingService.saveReadingProgress({
        userId: user.id,
        contentId: body.contentId,
        chapterId: body.chapterId,
        pageNumber: body.pageNumber,
        scrollPosition: body.scrollPosition,
        percentCompleted: body.percentCompleted,
      });
    }

    return apiSuccess({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
