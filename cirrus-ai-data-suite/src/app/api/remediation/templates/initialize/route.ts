import { withErrorHandler } from '@/utils/api-handler';
import { successResponse, errorResponse } from '@/utils/api-response';
import { FixTemplateService } from '@/services/fixTemplateService';

/**
 * POST /api/remediation/templates/initialize
 * Initialize system templates for remediation
 */
export const POST = withErrorHandler(async () => {
  try {
    const templateService = new FixTemplateService();
    const templates = await templateService.initializeSystemTemplates();
    
    return successResponse({
      templates,
      message: `Initialized ${templates.length} system templates`
    });
  } catch (error) {
    console.error('Failed to initialize remediation templates:', error);
    return errorResponse(error, 'Failed to initialize remediation templates');
  }
}, 'Failed to initialize remediation templates');