import { NextRequest } from 'next/server';
import { withErrorHandler } from '@/utils/api-handler';
import { successResponse, errorResponse } from '@/utils/api-response';

// Type definition for mock rules
interface MockRule {
  id: string;
  name: string;
  description: string;
  type: string;
  status: string;
  priority: string;
  category?: string;
  fieldName?: string;
  conditions: unknown;
  actions: unknown[];
  createdAt: string;
  createdBy: string;
  isActive: boolean;
  // Execution statistics
  executionCount: number;
  violationCount: number;
  lastExecuted?: string;
  successRate: number;
}

// Extend global namespace
declare global {
  // eslint-disable-next-line no-var
  var mockRules: MockRule[] | undefined;
}

// GET /api/quality-rules/[id] - Get a specific quality rule
export const GET = withErrorHandler(async (request: NextRequest, context?: unknown) => {
  const { params } = context as { params: { id: string } };
  try {
    const ruleId = params.id;
    console.log('Quality Rules API: Getting rule:', ruleId);
    
    // Find rule in memory
    const allRules = global.mockRules || [];
    const rule = allRules.find(r => r.id === ruleId);
    
    if (!rule) {
      return errorResponse(new Error('Rule not found'), 'Rule not found', 404);
    }
    
    return successResponse(rule);
  } catch (error) {
    console.error('Quality Rules API Get Error:', error);
    return errorResponse(error, 'Failed to get quality rule', 500);
  }
}, 'Failed to get quality rule');

// PUT /api/quality-rules/[id] - Update a quality rule
export const PUT = withErrorHandler(async (request: NextRequest, context?: unknown) => {
  const { params } = context as { params: { id: string } };
  try {
    const ruleId = params.id;
    const body = await request.json();
    console.log('Quality Rules API: Updating rule:', ruleId, body);
    
    // Find and update rule in memory
    const allRules = global.mockRules || [];
    const ruleIndex = allRules.findIndex(r => r.id === ruleId);
    
    if (ruleIndex === -1) {
      return errorResponse(new Error('Rule not found'), 'Rule not found', 404);
    }
    
    // Update the rule
    const updatedRule = {
      ...allRules[ruleIndex],
      ...body,
      updatedAt: new Date().toISOString()
    };
    
    allRules[ruleIndex] = updatedRule;
    global.mockRules = allRules;
    
    return successResponse(updatedRule, 'Quality rule updated successfully');
  } catch (error) {
    console.error('Quality Rules API Update Error:', error);
    return errorResponse(error, 'Failed to update quality rule', 500);
  }
}, 'Failed to update quality rule');

// DELETE /api/quality-rules/[id] - Delete a quality rule
export const DELETE = withErrorHandler(async (request: NextRequest, context?: unknown) => {
  const { params } = context as { params: { id: string } };
  try {
    const ruleId = params.id;
    console.log('Quality Rules API: Deleting rule:', ruleId);
    
    // Find and remove rule from memory
    const allRules = global.mockRules || [];
    const ruleIndex = allRules.findIndex(r => r.id === ruleId);
    
    if (ruleIndex === -1) {
      return errorResponse(new Error('Rule not found'), 'Rule not found', 404);
    }
    
    // Remove the rule
    allRules.splice(ruleIndex, 1);
    global.mockRules = allRules;
    
    return successResponse({ id: ruleId }, 'Quality rule deleted successfully');
  } catch (error) {
    console.error('Quality Rules API Delete Error:', error);
    return errorResponse(error, 'Failed to delete quality rule', 500);
  }
}, 'Failed to delete quality rule');