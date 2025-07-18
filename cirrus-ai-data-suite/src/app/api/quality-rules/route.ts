import { NextRequest } from 'next/server';
// import { qualityRulesService } from '@/services/qualityRulesService';
// import { CreateRuleRequest } from '@/types/qualityRules';
import { withErrorHandler } from '@/utils/api-handler';
import { successResponse, errorResponse } from '@/utils/api-response';

// GET /api/quality-rules - Get all quality rules
export const GET = withErrorHandler(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters = {
      status: searchParams.get('status') || undefined,
      type: searchParams.get('type') || undefined,
      category: searchParams.get('category') || undefined,
      isActive: searchParams.get('isActive') === 'true' ? true : 
                searchParams.get('isActive') === 'false' ? false : undefined
    };

    console.log('Quality Rules API: Fetching rules with filters:', filters);
    
    // Return mock rules from memory
    const allRules = global.mockRules || [];
    
    // Apply filters
    let filteredRules = allRules;
    if (filters.isActive !== undefined) {
      filteredRules = filteredRules.filter(r => r.isActive === filters.isActive);
    }
    if (filters.category) {
      filteredRules = filteredRules.filter(r => r.category === filters.category);
    }
    
    console.log('Quality Rules API: Returning', filteredRules.length, 'rules');
    
    return successResponse(filteredRules);
  } catch (error) {
    console.error('Quality Rules API Error:', error);
    return errorResponse(error, 'Failed to fetch quality rules', 500);
  }
}, 'Failed to fetch quality rules');

// POST /api/quality-rules - Create a new quality rule
export const POST = withErrorHandler(async (request: NextRequest) => {
  try {
    const body = await request.json();
    console.log('Quality Rules API: Creating rule with data:', body);
    
    // Handle both old and new request formats
    let ruleData;
    if (body.rule) {
      // Old format
      ruleData = body.rule;
    } else {
      // New format - create rule structure
      ruleData = {
        name: body.name,
        description: body.description,
        category: body.category,
        fieldName: body.fieldName,
        ruleType: body.ruleType,
        conditions: body.conditions || [],
        severity: body.severity || 'medium',
        isActive: body.isActive !== false,
        dataSourceId: body.dataSourceId
      };
    }
    
    // Basic validation
    if (!ruleData.name || !ruleData.conditions) {
      return errorResponse(new Error('Missing required fields'), 'Missing required fields: name and conditions are required', 400);
    }

    // For now, create a mock rule response
    const mockRule = {
      id: `rule-${Date.now()}`,
      ...ruleData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: body.createdBy || 'system',
      executionCount: 0,
      violationCount: 0,
      successRate: 0,
      lastExecuted: null
    };
    
    console.log('Quality Rules API: Created mock rule:', mockRule.id);
    
    // Store in memory for this session (will be lost on refresh)
    if (!global.mockRules) {
      global.mockRules = [];
    }
    global.mockRules.push(mockRule);
    
    return successResponse(mockRule, 'Quality rule created successfully', 201);
  } catch (error) {
    console.error('Quality Rules API Create Error:', error);
    return errorResponse(error, 'Failed to create quality rule', 500);
  }
}, 'Failed to create quality rule');