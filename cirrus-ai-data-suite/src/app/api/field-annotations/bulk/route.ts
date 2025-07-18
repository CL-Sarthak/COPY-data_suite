// CRITICAL: Import TypeORM initialization first
import '@/lib/init-typeorm';
import { NextRequest } from 'next/server';
import { FieldAnnotationService } from '@/services/fieldAnnotationService';
import { withValidation } from '@/utils/api-handler';
import { successResponse } from '@/utils/api-response';

// Configure route segment
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withValidation(
  async (request: NextRequest, body: { annotations: Array<Record<string, unknown>> }) => {
    const { annotations } = body;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = await FieldAnnotationService.bulkCreateOrUpdate(annotations as any);
    
    return successResponse({
      success: true,
      count: results.length,
      annotations: results
    }, 'Field annotations created/updated successfully', 201);
  },
  (body: unknown): { annotations: Array<Record<string, unknown>> } | null => {
    if (!body || typeof body !== 'object') return null;
    const obj = body as Record<string, unknown>;
    
    if (!obj.annotations || !Array.isArray(obj.annotations) || obj.annotations.length === 0) {
      return null;
    }
    
    // Validate all annotations have required fields
    for (const annotation of obj.annotations) {
      if (!annotation || typeof annotation !== 'object') return null;
      const ann = annotation as Record<string, unknown>;
      if (!ann.dataSourceId || !ann.fieldPath || !ann.fieldName) return null;
    }
    
    return obj as { annotations: Array<Record<string, unknown>> };
  },
  'annotations array is required with valid field annotations'
);