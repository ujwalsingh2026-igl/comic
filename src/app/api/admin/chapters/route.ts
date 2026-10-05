import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth-context';
import { AdminService } from '@/services/admin.service';
import { apiSuccess, handleApiError, AppError } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const body = await req.json();

    if (!body.contentId || body.chapterNumber === undefined || !body.title || !body.slug) {
      throw new AppError('VALIDATION_ERROR', 'Missing required chapter fields.');
    }

    const result = await AdminService.createChapter(body, admin.id);
    return apiSuccess(result, 'Chapter created successfully.', 201);
  } catch (err) {
    return handleApiError(err);
  }
}
