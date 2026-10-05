import { NextRequest } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { verifyAuthToken } from '@/lib/security';
import { AppError } from '@/lib/api-response';

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  username: string | null;
  role: string;
  avatarUrl: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
}

/**
 * Extracts authenticated user from NextRequest.
 * Checks Cookie sessionToken, Cookie authToken, or Authorization Bearer header.
 */
export async function getOptionalUser(req: NextRequest): Promise<AuthenticatedUser | null> {
  try {
    // 1. Check sessionToken cookie
    const sessionCookie = req.cookies.get('session_token')?.value;
    if (sessionCookie) {
      const sessionResult = await AuthService.validateSession(sessionCookie);
      if (sessionResult) return sessionResult.user;
    }

    // 2. Check Authorization Bearer header or auth_token cookie
    let bearerToken = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!bearerToken) {
      bearerToken = req.cookies.get('auth_token')?.value;
    }

    if (bearerToken) {
      const payload = await verifyAuthToken(bearerToken);
      if (payload && payload.userId) {
        const sessionResult = await AuthService.validateSession(bearerToken);
        if (sessionResult) return sessionResult.user;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Requires an authenticated user or throws 401 Unauthorized.
 */
export async function requireAuth(req: NextRequest): Promise<AuthenticatedUser> {
  const user = await getOptionalUser(req);
  if (!user) {
    throw new AppError('UNAUTHORIZED', 'Authentication required to access this resource.', 401);
  }
  return user;
}

/**
 * Requires user to have an ADMIN or SUPER_ADMIN role or throws 403 Forbidden.
 */
export async function requireAdmin(req: NextRequest): Promise<AuthenticatedUser> {
  const user = await requireAuth(req);
  if (user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
    throw new AppError('FORBIDDEN', 'Administrative privileges required.', 403);
  }
  return user;
}
