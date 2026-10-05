import { NextRequest } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { apiSuccess, handleApiError } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ipAddress = req.headers.get('x-forwarded-for') || req.ip || undefined;

    const result = await AuthService.requestPasswordReset(body.email, ipAddress);

    return apiSuccess(
      { success: true, token: result.token },
      'If an account exists with this email, instructions have been sent.'
    );
  } catch (err) {
    return handleApiError(err);
  }
}
