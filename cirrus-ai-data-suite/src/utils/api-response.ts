import { NextResponse } from 'next/server';
import { logger } from './logger';

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}

export interface ApiSuccessResponse<T = unknown> {
  data?: T;
  message?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Standard API error response handler
 */
export function errorResponse(
  error: unknown,
  defaultMessage: string = 'An error occurred',
  statusCode: number = 500
): NextResponse {
  // Log the error
  logger.error(defaultMessage, error);

  // Prepare error response
  const errorBody: ApiError = {
    message: defaultMessage,
  };

  // In development, include error details
  if (process.env.NODE_ENV === 'development') {
    if (error instanceof Error) {
      errorBody.message = error.message;
      errorBody.details = {
        stack: error.stack,
        name: error.name,
      };
    } else {
      errorBody.details = error;
    }
  }

  return NextResponse.json(errorBody, { status: statusCode });
}

/**
 * Standard API success response handler
 */
export function successResponse<T>(
  data: T,
  message?: string,
  statusCode: number = 200,
  metadata?: Record<string, unknown>
): NextResponse {
  const response: ApiSuccessResponse<T> = {
    data,
    message,
    metadata,
  };

  // Remove undefined fields
  Object.keys(response).forEach(key => {
    if (response[key as keyof ApiSuccessResponse<T>] === undefined) {
      delete response[key as keyof ApiSuccessResponse<T>];
    }
  });

  // If response only has data field, return data directly
  if (Object.keys(response).length === 1 && 'data' in response) {
    return NextResponse.json(data, { status: statusCode });
  }

  return NextResponse.json(response, { status: statusCode });
}

/**
 * Validation error response
 */
export function validationError(
  field: string,
  message: string,
  details?: Record<string, unknown>
): NextResponse {
  return NextResponse.json(
    {
      message: `Validation error: ${message}`,
      code: 'VALIDATION_ERROR',
      field,
      details,
    },
    { status: 400 }
  );
}

/**
 * Not found error response
 */
export function notFoundError(resource: string, id?: string): NextResponse {
  const message = id
    ? `${resource} with id '${id}' not found`
    : `${resource} not found`;
  
  return NextResponse.json(
    {
      message,
      code: 'NOT_FOUND',
    },
    { status: 404 }
  );
}

/**
 * Unauthorized error response
 */
export function unauthorizedError(message: string = 'Unauthorized'): NextResponse {
  return NextResponse.json(
    {
      message,
      code: 'UNAUTHORIZED',
    },
    { status: 401 }
  );
}

/**
 * Payload too large error response
 */
export function payloadTooLargeError(
  maxSize: string,
  actualSize?: string
): NextResponse {
  return NextResponse.json(
    {
      message: `Payload too large. Maximum size: ${maxSize}`,
      code: 'PAYLOAD_TOO_LARGE',
      details: actualSize ? { actualSize } : undefined,
    },
    { status: 413 }
  );
}