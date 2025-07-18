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
  async (request: NextRequest) => {
    // Check for query parameters
    const { searchParams } = new URL(request.url);
    const dataSourceId = searchParams.get('dataSourceId');
    const query = searchParams.get('query');
    
    if (dataSourceId) {
      // Get annotations for specific data source
      const annotations = await FieldAnnotationService.getByDataSource(dataSourceId);
      return successResponse(annotations);
    } else if (query) {
      // Search annotations
      const annotations = await FieldAnnotationService.searchAnnotations(query);
      return successResponse(annotations);
    } else {
      return errorResponse(
        new Error('Either dataSourceId or query parameter is required'),
        'Either dataSourceId or query parameter is required',
        400
      );
    }
  },
  { routeName: 'GET /api/field-annotations', defaultErrorMessage: 'Failed to fetch field annotations' }
);

export const POST = withValidation(
  async (request: NextRequest, body: Record<string, unknown> | Array<Record<string, unknown>>) => {
    // Support both single and bulk create/update
    if (Array.isArray(body)) {
      // Bulk create/update
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const annotations = await FieldAnnotationService.bulkCreateOrUpdate(body as any);
      return successResponse(annotations, 'Field annotations created/updated successfully', 201);
    } else {
      // Single create/update
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const annotation = await FieldAnnotationService.createOrUpdate(body as any);
      return successResponse(annotation, 'Field annotation created/updated successfully', 201);
    }
  },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (body: unknown): any => {
    if (!body) return null;
    
    // Handle both single and array inputs
    if (Array.isArray(body)) {
      // Validate each item in array
      for (const item of body) {
        if (!item || typeof item !== 'object') return null;
        const obj = item as Record<string, unknown>;
        if (!obj.dataSourceId || !obj.fieldPath || !obj.fieldName) return null;
      }
      return body as Record<string, unknown>[];
    } else {
      // Validate single object
      if (typeof body !== 'object') return null;
      const obj = body as Record<string, unknown>;
      if (!obj.dataSourceId || !obj.fieldPath || !obj.fieldName) return null;
      return obj;
    }
  },
  'Field annotation must include dataSourceId, fieldPath, and fieldName'
);

export const DELETE = apiHandler(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const dataSourceId = searchParams.get('dataSourceId');

    if (id) {
      await FieldAnnotationService.delete(id);
      return successResponse({ success: true }, 'Field annotation deleted successfully');
    } else if (dataSourceId) {
      await FieldAnnotationService.deleteByDataSource(dataSourceId);
      return successResponse({ success: true }, 'Field annotations deleted successfully');
    } else {
      return errorResponse(
        new Error('Either id or dataSourceId parameter is required'),
        'Either id or dataSourceId parameter is required',
        400
      );
    }
  },
  { routeName: 'DELETE /api/field-annotations', defaultErrorMessage: 'Failed to delete field annotation' }
);