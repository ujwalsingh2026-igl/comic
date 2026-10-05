import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-context';
import { PaymentService } from '@/services/payment.service';
import { apiSuccess, handleApiError, AppError } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();

    if (!body.orderNumber || !body.providerPaymentId || !body.providerSignature) {
      throw new AppError('VALIDATION_ERROR', 'orderNumber, providerPaymentId, and providerSignature are required.');
    }

    const ipAddress = req.headers.get('x-forwarded-for') || req.ip || undefined;

    const result = await PaymentService.verifyPayment({
      userId: user.id,
      orderNumber: body.orderNumber,
      providerPaymentId: body.providerPaymentId,
      providerSignature: body.providerSignature,
      ipAddress,
    });

    return apiSuccess(result, result.message);
  } catch (err) {
    return handleApiError(err);
  }
}
