import { NextRequest } from 'next/server';
import { getOptionalUser } from '@/lib/auth-context';
import { apiSuccess } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  const user = await getOptionalUser(req);
  return apiSuccess({ user });
}
