import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-context';
import { PaymentService } from '@/services/payment.service';
import { apiSuccess, handleApiError, AppError } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();

    if (!body.itemType || !body.targetId) {
      throw new AppError('VALIDATION_ERROR', 'itemType and targetId are required.');
    }

    const ipAddress = req.headers.get('x-forwarded-for') || req.ip || undefined;

    const order = await PaymentService.createOrder({
      userId: user.id,
      itemType: body.itemType,
      targetId: body.targetId,
      ipAddress,
    });

    return apiSuccess(order, 'Order created successfully.', 201);
  } catch (err) {
    return handleApiError(err);
  }
}
