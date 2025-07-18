import { NextRequest } from 'next/server';
import { withErrorHandler } from '@/utils/api-handler';
import { successResponse, errorResponse } from '@/utils/api-response';

// Type definition for mock templates
interface MockTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  fixMethod: string;
  usageCount: number;
  successRate: number;
  isSystemTemplate: boolean;
  templateType: 'normalization' | 'remediation' | 'global';
  createdAt: string;
  createdBy: string;
}

// Extend global namespace
declare global {
  // eslint-disable-next-line no-var
  var mockRemediationTemplates: MockTemplate[] | undefined;
}

/**
 * GET /api/normalization/templates
 * Get normalization templates with optional filtering
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters = {
      category: searchParams.get('category') || undefined,
      templateType: searchParams.get('templateType') || undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    };

    console.log('Normalization Templates API: Getting templates with filters:', filters);

    // Get templates from memory (they should be initialized)
    const allTemplates = global.mockRemediationTemplates || [];
    
    // Filter for normalization-specific templates
    let filteredTemplates = allTemplates.filter(template => 
      template.templateType === 'normalization' || template.templateType === 'global'
    );
    
    // Apply additional filters
    if (filters.category) {
      filteredTemplates = filteredTemplates.filter(t => t.category === filters.category);
    }
    if (filters.templateType) {
      filteredTemplates = filteredTemplates.filter(t => t.templateType === filters.templateType);
    }
    
    // Apply pagination
    // const _total = filteredTemplates.length;
    if (filters.offset) {
      filteredTemplates = filteredTemplates.slice(filters.offset);
    }
    if (filters.limit && filteredTemplates.length > filters.limit) {
      filteredTemplates = filteredTemplates.slice(0, filters.limit);
    }

    console.log('Normalization Templates API: Returning', filteredTemplates.length, 'templates');
    
    return successResponse(filteredTemplates);
  } catch (error) {
    console.error('Normalization Templates API Error:', error);
    return errorResponse(error, 'Failed to retrieve normalization templates', 500);
  }
}, 'Failed to retrieve normalization templates');

/**
 * POST /api/normalization/templates
 * Create a new normalization template
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  try {
    const body = await request.json();
    console.log('Normalization Templates API: Creating template with data:', body);
    
    // Basic validation
    if (!body.name || !body.fixMethod) {
      return errorResponse(new Error('Missing required fields'), 'Missing required fields: name and fixMethod are required', 400);
    }

    // Create mock template
    const mockTemplate = {
      id: `norm-template-${Date.now()}`,
      name: body.name,
      description: body.description || '',
      category: body.category || 'normalization',
      fixMethod: body.fixMethod,
      usageCount: 0,
      successRate: 1.0,
      isSystemTemplate: false,
      templateType: 'normalization' as const,
      createdAt: new Date().toISOString(),
      createdBy: body.createdBy || 'user'
    };
    
    console.log('Normalization Templates API: Created mock template:', mockTemplate.id);
    
    // Store in memory for this session
    if (!global.mockRemediationTemplates) {
      global.mockRemediationTemplates = [];
    }
    global.mockRemediationTemplates.push(mockTemplate);
    
    return successResponse(mockTemplate, 'Normalization template created successfully', 201);
  } catch (error) {
    console.error('Normalization Templates API Create Error:', error);
    return errorResponse(error, 'Failed to create normalization template', 500);
  }
}, 'Failed to create normalization template');