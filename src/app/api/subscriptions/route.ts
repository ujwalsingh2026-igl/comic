import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-context';
import { PaymentService } from '@/services/payment.service';
import { apiSuccess, handleApiError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const subscription = await PaymentService.getUserSubscription(user.id);
    return apiSuccess({
      subscription: subscription || {
        plan: 'FREE',
        status: 'ACTIVE',
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
