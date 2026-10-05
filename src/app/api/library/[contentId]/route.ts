import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-context';
import { ReadingService } from '@/services/reading.service';
import { apiSuccess, handleApiError } from '@/lib/api-response';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { contentId: string } }
) {
  try {
    const user = await requireAuth(req);
    await ReadingService.removeFromLibrary(user.id, params.contentId);
    return apiSuccess({ success: true }, 'Removed from library.');
  } catch (err) {
    return handleApiError(err);
  }
}
