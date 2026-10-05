import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth-context';
import { AdminService } from '@/services/admin.service';
import { apiSuccess, handleApiError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const metrics = await AdminService.getDashboardMetrics();
    return apiSuccess(metrics);
  } catch (err) {
    return handleApiError(err);
  }
}
