import { NextRequest } from 'next/server';
import { withErrorHandler } from '@/utils/api-handler';
import { successResponse, errorResponse } from '@/utils/api-response';
// import { qualityRulesService } from '@/services/qualityRulesService';

/**
 * GET /api/quality-rules/violations
 * Get violations for a data source
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const dataSourceId = searchParams.get('dataSourceId');
    
    if (!dataSourceId) {
      return errorResponse(new Error('Missing parameter'), 'dataSourceId is required', 400);
    }

    console.log('Violations API: Getting violations for data source:', dataSourceId);

    // For now, return mock violations since we don't have executions implemented yet
    const mockViolations = [
      {
        ruleId: 'rule-1',
        ruleName: 'Email Format Check',
        fieldName: 'email',
        category: 'validity',
        severity: 'medium',
        count: 15,
        samples: ['invalid-email', 'user@', 'test@domain']
      },
      {
        ruleId: 'rule-2',
        ruleName: 'Phone Number Completeness',
        fieldName: 'phone',
        category: 'completeness',
        severity: 'high',
        count: 8,
        samples: [null, '', '123']
      }
    ];
    
    return successResponse({
      violations: mockViolations,
      totalViolations: mockViolations.reduce((sum, v) => sum + v.count, 0),
      dataSourceId
    });
  } catch (error) {
    console.error('Violations API Error:', error);
    return errorResponse(error, 'Failed to retrieve violations', 500);
  }
}, 'Failed to retrieve violations');