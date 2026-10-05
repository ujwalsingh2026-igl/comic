import { NextRequest } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { apiSuccess, handleApiError } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ipAddress = req.headers.get('x-forwarded-for') || req.ip || undefined;

    await AuthService.resetPassword(body.token, body.password, ipAddress);

    return apiSuccess({ success: true }, 'Password has been reset successfully. Please log in with your new password.');
  } catch (err) {
    return handleApiError(err);
  }
}
