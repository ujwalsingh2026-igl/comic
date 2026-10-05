import { NextRequest } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { apiSuccess, handleApiError } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ipAddress = req.headers.get('x-forwarded-for') || req.ip || undefined;
    const userAgent = req.headers.get('user-agent') || undefined;

    const result = await AuthService.verifyPhoneOtp({
      phone: body.phone,
      code: body.code,
      ipAddress,
      userAgent,
    });

    const response = apiSuccess(
      { user: result.user, token: result.jwtToken },
      'Phone verification successful.'
    );

    response.cookies.set('session_token', result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: result.expiresAt,
    });

    response.cookies.set('auth_token', result.jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: result.expiresAt,
    });

    return response;
  } catch (err) {
    return handleApiError(err);
  }
}
