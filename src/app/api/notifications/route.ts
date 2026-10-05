import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-context';
import { NotificationService } from '@/services/notification.service';
import { apiSuccess, handleApiError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const result = await NotificationService.getUserNotifications(user.id);
    return apiSuccess(result);
  } catch (err) {
    return handleApiError(err);
  }
}
