import { NextRequest } from 'next/server';
import { withErrorHandler } from '@/utils/api-handler';
import { successResponse, errorResponse } from '@/utils/api-response';
import { getDatabase } from '@/database/connection';
import { DataQualityTemplateEntity } from '@/entities/DataQualityTemplateEntity';

/**
 * GET /api/data-quality-templates/[id]
 * Get a specific data quality template
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const GET = withErrorHandler(async (request: NextRequest, context: any) => {
  const { params } = context;
  try {
    const { id: templateId } = await params;
    console.log('Data Quality Templates API: Getting template', templateId);

    const db = await getDatabase();
    const repository = db.getRepository(DataQualityTemplateEntity);

    const template = await repository.findOne({ 
      where: { 
        id: templateId,
        isActive: true
      }
    });
    
    if (!template) {
      return errorResponse('Template not found', 'Template not found', 404);
    }

    return successResponse(template);
  } catch (error) {
    console.error('Data Quality Templates API Error:', error);
    return errorResponse(error, 'Failed to retrieve template', 500);
  }
}, 'Failed to retrieve template');

/**
 * PUT /api/data-quality-templates/[id]
 * Update a data quality template
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const PUT = withErrorHandler(async (request: NextRequest, context: any) => {
  const { params } = context;
  try {
    const { id: templateId } = await params;
    const body = await request.json();
    
    console.log('Data Quality Templates API: Updating template', templateId);

    const db = await getDatabase();
    const repository = db.getRepository(DataQualityTemplateEntity);

    const existingTemplate = await repository.findOne({ 
      where: { 
        id: templateId,
        isActive: true
      }
    });
    
    if (!existingTemplate) {
      return errorResponse('Template not found', 'Template not found', 404);
    }
    
    // Don't allow updating system templates
    if (existingTemplate.isSystemTemplate) {
      return errorResponse('Cannot modify system templates', 'Cannot modify system templates', 403);
    }

    // Check if name is being changed and if new name already exists
    if (body.name && body.name !== existingTemplate.name) {
      const duplicateName = await repository.findOne({ 
        where: { 
          name: body.name,
          isActive: true
        }
      });
      if (duplicateName) {
        return errorResponse('Template with this name already exists', 'Template with this name already exists', 409);
      }
    }

    // Update template
    Object.assign(existingTemplate, {
      ...body,
      id: templateId, // Preserve ID
      isSystemTemplate: existingTemplate.isSystemTemplate, // Preserve system flag
      createdAt: existingTemplate.createdAt, // Preserve creation date
      createdBy: existingTemplate.createdBy, // Preserve creator
      version: existingTemplate.version + 1,
      updatedBy: body.updatedBy || 'user'
    });

    const updatedTemplate = await repository.save(existingTemplate);
    
    console.log('Data Quality Templates API: Updated template successfully');
    return successResponse(updatedTemplate, 'Template updated successfully');
  } catch (error) {
    console.error('Data Quality Templates API Update Error:', error);
    return errorResponse(error, 'Failed to update template', 500);
  }
}, 'Failed to update template');

/**
 * DELETE /api/data-quality-templates/[id]
 * Delete a data quality template
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const DELETE = withErrorHandler(async (request: NextRequest, context: any) => {
  const { params } = context;
  try {
    const { id: templateId } = await params;
    console.log('Data Quality Templates API: Deleting template', templateId);

    const db = await getDatabase();
    const repository = db.getRepository(DataQualityTemplateEntity);

    const template = await repository.findOne({ 
      where: { 
        id: templateId,
        isActive: true
      }
    });
    
    if (!template) {
      return errorResponse('Template not found', 'Template not found', 404);
    }
    
    // Don't allow deleting system templates
    if (template.isSystemTemplate) {
      return errorResponse('Cannot delete system templates', 'Cannot delete system templates', 403);
    }

    // Soft delete by marking as inactive
    template.isActive = false;
    template.updatedBy = 'user';
    await repository.save(template);
    
    console.log('Data Quality Templates API: Deleted template successfully');
    return successResponse({ id: templateId }, 'Template deleted successfully');
  } catch (error) {
    console.error('Data Quality Templates API Delete Error:', error);
    return errorResponse(error, 'Failed to delete template', 500);
  }
}, 'Failed to delete template');