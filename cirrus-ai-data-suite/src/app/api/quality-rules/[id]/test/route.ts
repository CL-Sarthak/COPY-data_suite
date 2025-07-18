import { NextRequest } from 'next/server';
import { qualityRulesService } from '@/services/qualityRulesService';
import { TestRuleRequest } from '@/types/qualityRules';
import { withErrorHandler } from '@/utils/api-handler';
import { successResponse, errorResponse } from '@/utils/api-response';

// POST /api/quality-rules/[id]/test - Test a quality rule
export const POST = withErrorHandler(async (request: NextRequest, context?: unknown) => {
  const { params } = context as { params: Promise<{ id: string }> };
  const { id } = await params;
  const body = await request.json() as Partial<TestRuleRequest>;
  
  // Get the rule
  const rule = await qualityRulesService.getRule(id);
  if (!rule) {
    return errorResponse(new Error('Rule not found'), 'Quality rule not found', 404);
  }
  
  // Create test request with the rule
  const testRequest: TestRuleRequest = {
    rule,
    sampleData: body.sampleData,
    sampleSize: body.sampleSize || 100,
    dataSourceId: body.dataSourceId
  };
  
  const testResult = await qualityRulesService.testRule(testRequest);
  return successResponse(testResult, 'Rule test completed');
});