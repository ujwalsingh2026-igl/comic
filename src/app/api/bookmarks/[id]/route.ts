import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-context';
import { ReadingService } from '@/services/reading.service';
import { apiSuccess, handleApiError } from '@/lib/api-response';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req);
    await ReadingService.deleteBookmark(user.id, params.id);
    return apiSuccess({ success: true }, 'Bookmark deleted.');
  } catch (err) {
    return handleApiError(err);
  }
}
