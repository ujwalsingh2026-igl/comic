import { NextRequest } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { apiSuccess, handleApiError } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const sessionToken = req.cookies.get('session_token')?.value;
    if (sessionToken) {
      await AuthService.logout(sessionToken);
    }

    const response = apiSuccess({ success: true }, 'Logged out successfully.');

    // Clear cookies
    response.cookies.set('session_token', '', { path: '/', maxAge: 0 });
    response.cookies.set('auth_token', '', { path: '/', maxAge: 0 });

    return response;
  } catch (err) {
    return handleApiError(err);
  }
}
