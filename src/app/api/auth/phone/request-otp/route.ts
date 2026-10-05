import { NextRequest } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { apiSuccess, handleApiError } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ipAddress = req.headers.get('x-forwarded-for') || req.ip || undefined;

    const result = await AuthService.requestPhoneOtp({
      phone: body.phone,
      ipAddress,
    });

    return apiSuccess(result, result.message);
  } catch (err) {
    return handleApiError(err);
  }
}
