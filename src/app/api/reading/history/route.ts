import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-context';
import { ReadingService } from '@/services/reading.service';
import { apiSuccess, handleApiError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const history = await ReadingService.getReadingHistory(user.id);
    return apiSuccess(history);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await ReadingService.clearReadingHistory(user.id);
    return apiSuccess({ success: true }, 'Reading history cleared.');
  } catch (err) {
    return handleApiError(err);
  }
}
