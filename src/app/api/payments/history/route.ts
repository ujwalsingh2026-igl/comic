import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-context';
import { PaymentService } from '@/services/payment.service';
import { apiSuccess, handleApiError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const orders = await PaymentService.getUserOrders(user.id);
    return apiSuccess(orders);
  } catch (err) {
    return handleApiError(err);
  }
}
