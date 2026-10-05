import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-context';
import { ReadingService } from '@/services/reading.service';
import { apiSuccess, handleApiError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const contentId = new URL(req.url).searchParams.get('contentId') || undefined;
    const bookmarks = await ReadingService.getBookmarks(user.id, contentId);
    return apiSuccess(bookmarks);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();

    const result = await ReadingService.createBookmark({
      userId: user.id,
      contentId: body.contentId,
      chapterId: body.chapterId,
      pageNumber: body.pageNumber,
      audioPositionSeconds: body.audioPositionSeconds,
      note: body.note,
    });

    return apiSuccess(result, 'Bookmark added successfully.', 201);
  } catch (err) {
    return handleApiError(err);
  }
}
