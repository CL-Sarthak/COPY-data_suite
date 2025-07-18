import { NextRequest } from 'next/server';
import { withErrorHandler } from '@/utils/api-handler';
import { successResponse, errorResponse } from '@/utils/api-response';
import { FixTemplateService } from '@/services/fixTemplateService';
import { FixTemplateCategory } from '@/types/remediation';

/**
 * GET /api/remediation/templates
 * Get all fix templates for remediation
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    
    const filters = {
      category: searchParams.get('category') as FixTemplateCategory || undefined,
      applicableType: searchParams.get('applicableType') || undefined,
      search: searchParams.get('search') || undefined,
      isSystemTemplate: searchParams.get('isSystemTemplate') ? 
        searchParams.get('isSystemTemplate') === 'true' : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0
    };

    const templateService = new FixTemplateService();
    const result = await templateService.getTemplates(filters);
    
    return successResponse({
      templates: result.templates,
      total: result.total
    });
  } catch (error) {
    console.error('Failed to fetch remediation templates:', error);
    return errorResponse(error, 'Failed to fetch remediation templates');
  }
}, 'Failed to fetch remediation templates');