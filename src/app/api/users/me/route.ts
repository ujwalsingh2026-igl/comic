import { NextRequest } from 'next/server';
import { requireAuth } from '@/lib/auth-context';
import { UserService } from '@/services/user.service';
import { apiSuccess, handleApiError } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const profile = await UserService.getProfile(user.id);
    return apiSuccess(profile);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json();

    const updated = await UserService.updateProfile({
      userId: user.id,
      name: body.name,
      username: body.username,
      avatarUrl: body.avatarUrl,
    });

    return apiSuccess(updated, 'Profile updated successfully.');
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth(req);
    const body = await req.json().catch(() => ({}));

    const result = await UserService.deleteAccount(user.id, body.reason);

    const response = apiSuccess(result, result.message);
    response.cookies.set('session_token', '', { path: '/', maxAge: 0 });
    response.cookies.set('auth_token', '', { path: '/', maxAge: 0 });
    return response;
  } catch (err) {
    return handleApiError(err);
  }
}
