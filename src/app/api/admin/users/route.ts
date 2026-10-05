import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth-context';
import { AdminService } from '@/services/admin.service';
import { apiSuccess, handleApiError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const url = new URL(req.url);
    const q = url.searchParams.get('q') || undefined;
    const role = url.searchParams.get('role') || undefined;
    const status = url.searchParams.get('status') || undefined;
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!, 10) : 25;
    const offset = url.searchParams.get('offset') ? parseInt(url.searchParams.get('offset')!, 10) : 0;

    const users = await AdminService.getUsers(q, role, status, limit, offset);
    return apiSuccess(users);
  } catch (err) {
    return handleApiError(err);
  }
}
