import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-context';
import { UserService } from '@/services/user.service';
import { apiSuccess, handleApiError } from '@/lib/api-response';

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();

    const privacy = await UserService.updatePrivacy({
      userId: user.id,
      isProfilePublic: body.isProfilePublic,
      showReadingActivity: body.showReadingActivity,
      showReviews: body.showReviews,
      allowPersonalization: body.allowPersonalization,
      allowAnalytics: body.allowAnalytics,
      allowMarketing: body.allowMarketing,
      allowPushAlerts: body.allowPushAlerts,
      allowPersonalizedAds: body.allowPersonalizedAds,
    });

    return apiSuccess(privacy, 'Privacy settings updated successfully.');
  } catch (err) {
    return handleApiError(err);
  }
}
