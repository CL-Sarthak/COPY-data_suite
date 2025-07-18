import { NextRequest } from 'next/server';
import { withErrorHandler } from '@/utils/api-handler';
import { successResponse, errorResponse } from '@/utils/api-response';
import { FixTemplateService } from '@/services/fixTemplateService';

const templateService = new FixTemplateService();

/**
 * GET /api/fix-templates
 * Get all fix templates with filtering
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters = {
      category: (searchParams.get('category') as 'data_cleaning' | 'format_standardization' | 'data_validation' | 'business_logic') || undefined,
      applicableType: searchParams.get('applicableType') || undefined,
      search: searchParams.get('search') || undefined,
      isSystemTemplate: searchParams.get('isSystemTemplate') ? 
        searchParams.get('isSystemTemplate') === 'true' : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0
    };

    // Initialize system templates if needed
    await templateService.initializeSystemTemplates();

    const result = await templateService.getTemplates(filters);
    
    return successResponse({
      templates: result.templates,
      total: result.total
    });
  } catch (error) {
    console.error('Failed to fetch fix templates:', error);
    return errorResponse(error, 'Failed to fetch fix templates');
  }
}, 'Failed to fetch fix templates');

/**
 * POST /api/fix-templates
 * Create a new fix template
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  try {
    const body = await request.json();
    
    if (!body.name || !body.fixMethod || !body.category) {
      return errorResponse('Missing required fields', 'Invalid request', 400);
    }

    const template = await templateService.createTemplate(body);
    
    return successResponse(template, 'Fix template created successfully');
  } catch (error) {
    console.error('Failed to create fix template:', error);
    return errorResponse(error, 'Failed to create fix template');
  }
}, 'Failed to create fix template');