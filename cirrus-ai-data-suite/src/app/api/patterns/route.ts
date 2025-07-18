// import { NextRequest } from 'next/server';
import { PatternService } from '@/services/patternService';
import { apiHandler, withValidation } from '@/utils/api-handler';
import { successResponse } from '@/utils/api-response';

export const GET = apiHandler(
  async () => {
    const patterns = await PatternService.getAllPatterns();
    return successResponse(patterns);
  },
  { routeName: 'GET /api/patterns', defaultErrorMessage: 'Failed to fetch patterns' }
);

export const POST = withValidation(
  async (request, body) => {
    const pattern = await PatternService.createPattern(body as Parameters<typeof PatternService.createPattern>[0]);
    return successResponse(pattern, 'Pattern created successfully', 201);
  },
  (body: unknown): Record<string, unknown> | null => {
    if (!body || typeof body !== 'object') return null;
    const obj = body as Record<string, unknown>;
    if (!obj.name || !obj.type) return null;
    return obj;
  },
  'Pattern name and type are required'
);