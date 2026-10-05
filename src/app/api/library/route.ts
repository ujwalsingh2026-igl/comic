import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-context';
import { ReadingService } from '@/services/reading.service';
import { apiSuccess, handleApiError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const shelf = new URL(req.url).searchParams.get('shelf') || undefined;
    const library = await ReadingService.getUserLibrary(user.id, shelf);
    return apiSuccess(library);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();
    const result = await ReadingService.updateLibraryShelf(user.id, body.contentId, body.shelf);
    return apiSuccess(result, 'Library updated successfully.');
  } catch (err) {
    return handleApiError(err);
  }
}
