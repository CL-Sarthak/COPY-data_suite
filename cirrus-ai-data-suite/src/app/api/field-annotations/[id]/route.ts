// CRITICAL: Import TypeORM initialization first
import '@/lib/init-typeorm';
import { NextRequest } from 'next/server';
import { FieldAnnotationService } from '@/services/fieldAnnotationService';
import { apiHandler, withValidation } from '@/utils/api-handler';
import { successResponse, errorResponse } from '@/utils/api-response';

// Configure route segment
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = apiHandler(
  async (request: NextRequest, context?: unknown) => {
    const ctx = context as { params: Promise<{ id: string }> };
    const { id } = await ctx.params;
    const annotation = await FieldAnnotationService.getById(id);
    
    if (!annotation) {
      return errorResponse(new Error('Field annotation not found'), 'Field annotation not found', 404);
    }
    
    return successResponse(annotation);
  },
  { routeName: 'GET /api/field-annotations/[id]', defaultErrorMessage: 'Failed to fetch field annotation' }
);

export const PUT = withValidation(
  async (request: NextRequest, body: Record<string, unknown>, context?: unknown) => {
    const ctx = context as { params: Promise<{ id: string }> };
    const { id } = await ctx.params;
    const annotation = await FieldAnnotationService.updateById(id, body);
    
    if (!annotation) {
      return errorResponse(new Error('Field annotation not found'), 'Field annotation not found', 404);
    }
    
    return successResponse(annotation, 'Field annotation updated successfully');
  },
  (body: unknown): Record<string, unknown> | null => {
    if (!body || typeof body !== 'object') return null;
    // For updates, we don't require all fields
    return body as Record<string, unknown>;
  },
  'Invalid field annotation data'
);

export const DELETE = apiHandler(
  async (request: NextRequest, context?: unknown) => {
    const ctx = context as { params: Promise<{ id: string }> };
    const { id } = await ctx.params;
    
    // Check if annotation exists
    const annotation = await FieldAnnotationService.getById(id);
    if (!annotation) {
      return errorResponse(new Error('Field annotation not found'), 'Field annotation not found', 404);
    }
    
    await FieldAnnotationService.delete(id);
    return successResponse({ success: true }, 'Field annotation deleted successfully');
  },
  { routeName: 'DELETE /api/field-annotations/[id]', defaultErrorMessage: 'Failed to delete field annotation' }
);