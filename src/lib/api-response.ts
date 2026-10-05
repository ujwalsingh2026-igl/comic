import { NextResponse } from 'next/server';

export type ApiErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'PAYMENT_REQUIRED'
  | 'INTERNAL_ERROR';

export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
    details?: unknown;
  };
}

export class AppError extends Error {
  constructor(
    public code: ApiErrorCode,
    message: string,
    public statusCode: number = 400,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function apiSuccess<T>(data: T, message?: string, status = 200) {
  const body: ApiSuccessResponse<T> = {
    success: true,
    data,
    ...(message ? { message } : {}),
  };
  return NextResponse.json(body, { status });
}

export function apiError(
  code: ApiErrorCode,
  message: string,
  statusCode = 400,
  details?: unknown
) {
  const body: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details !== undefined ? { details } : {}),
    },
  };
  return NextResponse.json(body, { status: statusCode });
}

export function handleApiError(err: unknown) {
  if (err instanceof AppError) {
    return apiError(err.code, err.message, err.statusCode, err.details);
  }

  console.error('[Unhandled API Error]:', err);
  return apiError(
    'INTERNAL_ERROR',
    'An unexpected error occurred. Please try again later.',
    500
  );
}
