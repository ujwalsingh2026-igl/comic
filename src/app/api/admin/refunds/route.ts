import { NextRequest } from 'next/server';
import { requireAdmin } from '@/lib/auth-context';
import { PaymentService } from '@/services/payment.service';
import { apiSuccess, handleApiError, AppError } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin(req);
    const body = await req.json();

    if (!body.orderId || !body.amountCents) {
      throw new AppError('VALIDATION_ERROR', 'orderId and amountCents are required.');
    }

    const result = await PaymentService.processRefund({
      orderId: body.orderId,
      amountCents: body.amountCents,
      reason: body.reason,
      adminUserId: admin.id,
    });

    return apiSuccess(result, 'Refund processed and access revoked successfully.');
  } catch (err) {
    return handleApiError(err);
  }
}
