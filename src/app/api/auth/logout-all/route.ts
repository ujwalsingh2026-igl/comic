import { NextRequest } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { requireAuth } from '@/lib/auth-context';
import { apiSuccess, handleApiError } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    await AuthService.logoutAllDevices(user.id);

    const response = apiSuccess({ success: true }, 'Logged out from all devices.');
    response.cookies.set('session_token', '', { path: '/', maxAge: 0 });
    response.cookies.set('auth_token', '', { path: '/', maxAge: 0 });

    return response;
  } catch (err) {
    return handleApiError(err);
  }
}
