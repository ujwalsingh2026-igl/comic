import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-context';
import { NotificationService } from '@/services/notification.service';
import { apiSuccess, handleApiError } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await NotificationService.markAllAsRead(user.id);
    return apiSuccess({ success: true }, 'All notifications marked as read.');
  } catch (err) {
    return handleApiError(err);
  }
}
