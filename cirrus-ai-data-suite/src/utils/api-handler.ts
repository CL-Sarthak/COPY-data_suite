import { NextRequest, NextResponse } from 'next/server';
import { errorResponse } from './api-response';
import { logger } from './logger';

type RouteHandler = (
  request: NextRequest,
  context?: unknown
) => Promise<NextResponse> | NextResponse;

/**
 * Wraps an API route handler with standard error handling
 */
export function withErrorHandler(
  handler: RouteHandler,
  defaultErrorMessage: string = 'An error occurred'
): RouteHandler {
  return async (request: NextRequest, context?: unknown) => {
    try {
      return await handler(request, context);
    } catch (error) {
      return errorResponse(error, defaultErrorMessage);
    }
  };
}

/**
 * Validates request body and wraps with error handling
 */
export function withValidation<T>(
  handler: (request: NextRequest, body: T, context?: unknown) => Promise<NextResponse>,
  validator: (body: unknown) => T | null,
  defaultErrorMessage: string = 'Invalid request body'
): RouteHandler {
  return withErrorHandler(async (request: NextRequest, context?: unknown) => {
    let body: unknown;
    
    try {
      body = await request.json();
    } catch {
      return errorResponse(
        new Error('Invalid JSON in request body'),
        'Invalid request format',
        400
      );
    }

    const validatedBody = validator(body);
    if (!validatedBody) {
      return errorResponse(
        new Error('Request validation failed'),
        defaultErrorMessage,
        400
      );
    }

    return handler(request, validatedBody, context);
  });
}

/**
 * Adds timing and logging to route handlers
 */
export function withLogging(
  handler: RouteHandler,
  routeName: string
): RouteHandler {
  return async (request: NextRequest, context?: unknown) => {
    const startTime = Date.now();
    const method = request.method;
    const url = request.url;

    logger.info(`${method} ${routeName} - Request started`, { url });

    try {
      const response = await handler(request, context);
      const duration = Date.now() - startTime;
      
      logger.info(`${method} ${routeName} - Request completed`, {
        url,
        status: response.status,
        duration: `${duration}ms`,
      });

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error(`${method} ${routeName} - Request failed`, {
        url,
        duration: `${duration}ms`,
        error,
      });

      throw error;
    }
  };
}

/**
 * Combines all middleware
 */
export function apiHandler(
  handler: RouteHandler,
  options: {
    routeName: string;
    defaultErrorMessage?: string;
    enableLogging?: boolean;
  }
): RouteHandler {
  let wrappedHandler = handler;

  // Add error handling
  wrappedHandler = withErrorHandler(
    wrappedHandler,
    options.defaultErrorMessage
  );

  // Add logging if enabled
  if (options.enableLogging !== false) {
    wrappedHandler = withLogging(wrappedHandler, options.routeName);
  }

  return wrappedHandler;
}