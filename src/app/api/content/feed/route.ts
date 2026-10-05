import { NextRequest } from 'next/server';
import { ContentService } from '@/services/content.service';
import { apiSuccess, handleApiError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const feed = await ContentService.getHomeFeed();
    return apiSuccess(feed);
  } catch (err) {
    return handleApiError(err);
  }
}
