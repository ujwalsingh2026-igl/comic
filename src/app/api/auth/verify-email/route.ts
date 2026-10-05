import { NextRequest } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { apiSuccess, handleApiError } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    await AuthService.verifyEmail(body.token);
    return apiSuccess({ success: true }, 'Email verified successfully.');
  } catch (err) {
    return handleApiError(err);
  }
}
