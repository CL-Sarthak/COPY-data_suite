import { NextRequest } from 'next/server';
import { withErrorHandler } from '@/utils/api-handler';
import { successResponse, errorResponse } from '@/utils/api-response';

// GET /api/quality-rules/executions - Get rule execution history
export const GET = withErrorHandler(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters = {
      ruleId: searchParams.get('ruleId') || undefined,
      dataSourceId: searchParams.get('dataSourceId') || undefined,
      status: searchParams.get('status') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50
    };

    console.log('Executions API: Getting executions with filters:', filters);

    // Get executions from memory or return empty array
    const allExecutions = global.mockRuleExecutions || [];
    
    // Apply filters
    let filteredExecutions = allExecutions;
    if (filters.ruleId) {
      filteredExecutions = filteredExecutions.filter(e => e.ruleId === filters.ruleId);
    }
    if (filters.dataSourceId) {
      filteredExecutions = filteredExecutions.filter(e => e.dataSourceId === filters.dataSourceId);
    }
    if (filters.status) {
      filteredExecutions = filteredExecutions.filter(e => e.status === filters.status);
    }
    
    // Apply limit
    if (filters.limit && filteredExecutions.length > filters.limit) {
      filteredExecutions = filteredExecutions.slice(0, filters.limit);
    }

    console.log('Executions API: Returning', filteredExecutions.length, 'executions');
    
    return successResponse(filteredExecutions);
  } catch (error) {
    console.error('Executions API Error:', error);
    return errorResponse(error, 'Failed to retrieve executions', 500);
  }
}, 'Failed to retrieve executions');