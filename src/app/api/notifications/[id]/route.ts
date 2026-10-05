import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-context';
import { NotificationService } from '@/services/notification.service';
import { apiSuccess, handleApiError } from '@/lib/api-response';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth(req);
    await NotificationService.markAsRead(user.id, params.id);
    return apiSuccess({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
