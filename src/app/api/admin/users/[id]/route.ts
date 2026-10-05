import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth-context';
import { AdminService } from '@/services/admin.service';
import { apiSuccess, handleApiError, AppError } from '@/lib/api-response';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await requireAdmin(req);
    const body = await req.json();

    if (!body.status || !['ACTIVE', 'SUSPENDED'].includes(body.status)) {
      throw new AppError('VALIDATION_ERROR', 'Valid status (ACTIVE or SUSPENDED) is required.');
    }

    const result = await AdminService.updateUserStatus(params.id, body.status, admin.id);
    return apiSuccess(result, `User status updated to ${body.status}.`);
  } catch (err) {
    return handleApiError(err);
  }
}
