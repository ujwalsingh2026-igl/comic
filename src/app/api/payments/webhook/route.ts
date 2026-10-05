import { NextRequest } from 'next/server';
import { PaymentService } from '@/services/payment.service';
import { apiSuccess, handleApiError, AppError } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    if (!signature) {
      throw new AppError('UNAUTHORIZED', 'Missing webhook signature header.', 401);
    }

    const result = await PaymentService.handleWebhook(rawBody, signature);
    return apiSuccess(result);
  } catch (err) {
    return handleApiError(err);
  }
}
