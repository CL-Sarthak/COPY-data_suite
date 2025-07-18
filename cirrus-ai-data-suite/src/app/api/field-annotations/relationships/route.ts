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
    const { searchParams } = new URL(request.url);
    const fieldId = searchParams.get('fieldId');
    
    if (!fieldId) {
      return errorResponse(
        new Error('fieldId parameter is required'),
        'fieldId parameter is required',
        400
      );
    }
    
    const relationships = await FieldAnnotationService.getRelationshipsByField(fieldId);
    return successResponse(relationships);
  },
  { routeName: 'GET /api/field-annotations/relationships', defaultErrorMessage: 'Failed to fetch field relationships' }
);

export const POST = withValidation(
  async (request: NextRequest, body: Record<string, unknown>) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const relationship = await FieldAnnotationService.createRelationship(body as any);
    return successResponse(relationship, 'Field relationship created successfully', 201);
  },
  (body: unknown): Record<string, unknown> | null => {
    if (!body || typeof body !== 'object') return null;
    const obj = body as Record<string, unknown>;
    
    if (!obj.sourceFieldId || !obj.targetFieldId || !obj.relationshipType) {
      return null;
    }
    
    return obj;
  },
  'Field relationship must include sourceFieldId, targetFieldId, and relationshipType'
);

export const DELETE = apiHandler(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return errorResponse(
        new Error('id parameter is required'),
        'id parameter is required',
        400
      );
    }
    
    await FieldAnnotationService.deleteRelationship(id);
    return successResponse({ success: true }, 'Field relationship deleted successfully');
  },
  { routeName: 'DELETE /api/field-annotations/relationships', defaultErrorMessage: 'Failed to delete field relationship' }
);