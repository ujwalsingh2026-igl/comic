import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth-context';
import { AdminService } from '@/services/admin.service';
import { apiSuccess, handleApiError, AppError } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const body = await req.json();

    if (!body.title || !body.slug || !body.contentType || !body.authorId || !body.coverUrl) {
      throw new AppError('VALIDATION_ERROR', 'Missing required content creation fields.');
    }

    const result = await AdminService.createContent(body, admin.id);
    return apiSuccess(result, 'Content created successfully.', 201);
  } catch (err) {
    return handleApiError(err);
  }
}
