import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-context';
import { UserService } from '@/services/user.service';
import { apiSuccess, handleApiError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const exportData = await UserService.exportUserData(user.id);
    return apiSuccess(exportData, 'Personal data export generated successfully.');
  } catch (err) {
    return handleApiError(err);
  }
}
