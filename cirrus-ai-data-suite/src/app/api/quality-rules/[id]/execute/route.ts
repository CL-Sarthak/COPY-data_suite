import { NextRequest } from 'next/server';
import { withErrorHandler } from '@/utils/api-handler';
import { successResponse, errorResponse } from '@/utils/api-response';

// Type definition for mock rule executions
interface MockRuleExecution {
  id: string;
  ruleId: string;
  ruleName: string;
  ruleCategory?: string;
  fieldName?: string;
  dataSourceId: string;
  dataSourceName: string;
  executedAt: string;
  completedAt: string;
  status: 'success' | 'failed' | 'partial' | 'completed';
  recordsChecked: number;
  violationsFound: number;
  executionTime: number;
}

// Extend global namespace
declare global {
  // eslint-disable-next-line no-var
  var mockRuleExecutions: MockRuleExecution[] | undefined;
}

// POST /api/quality-rules/[id]/execute - Execute a quality rule
export const POST = withErrorHandler(async (request: NextRequest, context?: unknown) => {
  const { params } = context as { params: { id: string } };
  try {
    const ruleId = params.id;
    const body = await request.json();
    console.log('Quality Rules Execute API: Executing rule:', ruleId, body);
    
    // Find rule in memory
    const allRules = global.mockRules || [];
    const rule = allRules.find(r => r.id === ruleId);
    
    if (!rule) {
      return errorResponse(new Error('Rule not found'), 'Rule not found', 404);
    }
    
    // Simulate rule execution with mock results
    const violationsFound = Math.floor(Math.random() * 20) + 1; // Random violations 1-20
    const recordsChecked = Math.floor(Math.random() * 1000) + 100; // Random records 100-1100
    
    const mockExecution = {
      id: `execution-${Date.now()}`,
      ruleId: ruleId,
      status: 'completed' as const,
      dataSourceId: body.dataSourceId || 'ds-1',
      dataSourceName: 'Mock Data Source',
      violationsFound: violationsFound,
      recordsChecked: recordsChecked,
      executedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      executionTime: Math.floor(Math.random() * 5000) + 500, // Random time 500-5500ms
      // Store rule info for violation generation
      ruleName: rule.name,
      ruleCategory: rule.category,
      fieldName: rule.fieldName
    };
    
    // Update rule statistics
    const ruleIndex = allRules.findIndex(r => r.id === ruleId);
    if (ruleIndex !== -1) {
      allRules[ruleIndex] = {
        ...allRules[ruleIndex],
        executionCount: allRules[ruleIndex].executionCount + 1,
        violationCount: allRules[ruleIndex].violationCount + mockExecution.violationsFound,
        lastExecuted: mockExecution.executedAt,
        successRate: mockExecution.violationsFound === 0 ? 1.0 : 
          Math.max(0, 1 - (mockExecution.violationsFound / mockExecution.recordsChecked))
      };
      global.mockRules = allRules;
    }
    
    // Store execution in memory
    if (!global.mockRuleExecutions) {
      global.mockRuleExecutions = [];
    }
    global.mockRuleExecutions.unshift(mockExecution); // Add to beginning for recent first
    
    // Keep only last 50 executions
    if (global.mockRuleExecutions.length > 50) {
      global.mockRuleExecutions = global.mockRuleExecutions.slice(0, 50);
    }
    
    console.log('Quality Rules Execute API: Rule executed successfully:', mockExecution);
    
    return successResponse(mockExecution, 'Rule executed successfully');
  } catch (error) {
    console.error('Quality Rules Execute API Error:', error);
    return errorResponse(error, 'Failed to execute quality rule', 500);
  }
}, 'Failed to execute quality rule');