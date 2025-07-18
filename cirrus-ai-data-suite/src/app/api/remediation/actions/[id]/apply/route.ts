import { NextRequest } from 'next/server';
import { RemediationJobService } from '@/services/remediationJobService';
import { withErrorHandler } from '@/utils/api-handler';
import { successResponse, errorResponse } from '@/utils/api-response';

const remediationJobService = new RemediationJobService();

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/remediation/actions/[id]/apply
 * Apply a specific remediation action
 */
export const POST = withErrorHandler(async (request: NextRequest, context?: unknown) => {
  const { params } = context as RouteParams;
  const { id } = await params;
  
  try {
    const action = await remediationJobService.applyAction(id);
    
    if (!action) {
      return errorResponse(new Error('Remediation action not found'), 'Remediation action not found', 404);
    }
    
    return successResponse(action, 'Remediation action applied successfully');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to apply remediation action';
    return errorResponse(error, message, 400);
  }
});