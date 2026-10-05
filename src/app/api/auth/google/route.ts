import { NextRequest } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { apiSuccess, handleApiError, AppError } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ipAddress = req.headers.get('x-forwarded-for') || req.ip || undefined;
    const userAgent = req.headers.get('user-agent') || undefined;

    // Validate Google payload
    if (!body.googleId || !body.email || !body.name) {
      throw new AppError('VALIDATION_ERROR', 'Missing Google profile identity fields.');
    }

    const result = await AuthService.googleAuth({
      googleId: body.googleId,
      email: body.email,
      name: body.name,
      avatarUrl: body.avatarUrl,
      ipAddress,
      userAgent,
    });

    const response = apiSuccess(
      { user: result.user, token: result.jwtToken },
      'Google authentication successful.'
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
