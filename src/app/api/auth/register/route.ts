import { NextRequest, NextResponse } from 'next/server';
import { AuthService } from '@/services/auth.service';
import { apiSuccess, handleApiError } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ipAddress = req.headers.get('x-forwarded-for') || req.ip || undefined;
    const userAgent = req.headers.get('user-agent') || undefined;

    const result = await AuthService.register({
      name: body.name,
      email: body.email,
      password: body.password,
      ipAddress,
      userAgent,
    });

    return apiSuccess(
      { userId: result.userId, verificationToken: result.verificationToken },
      'Registration successful. Please verify your email address.',
      201
    );
  } catch (err) {
    return handleApiError(err);
  }
}
