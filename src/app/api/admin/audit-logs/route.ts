import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth-context';
import { AuditService } from '@/services/audit.service';
import { apiSuccess, handleApiError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    const url = new URL(req.url);
    const limit = url.searchParams.get('limit') ? parseInt(url.searchParams.get('limit')!, 10) : 50;
    const offset = url.searchParams.get('offset') ? parseInt(url.searchParams.get('offset')!, 10) : 0;

    const logs = await AuditService.getLogs(limit, offset);
    return apiSuccess(logs);
  } catch (err) {
    return handleApiError(err);
  }
}
