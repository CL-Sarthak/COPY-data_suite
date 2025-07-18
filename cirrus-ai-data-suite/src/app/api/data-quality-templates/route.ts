import { NextRequest } from 'next/server';
import { withErrorHandler } from '@/utils/api-handler';
import { successResponse, errorResponse } from '@/utils/api-response';
import { getDatabase } from '@/database/connection';
import { DataQualityTemplateEntity } from '@/entities/DataQualityTemplateEntity';
import { Repository } from 'typeorm';

/**
 * GET /api/data-quality-templates
 * Get all data quality templates with optional filtering
 */
export const GET = withErrorHandler(async (request: NextRequest) => {
  try {
    console.log('Data Quality Templates API: Starting GET request');
    const { searchParams } = new URL(request.url);
    
    const filters = {
      templateType: searchParams.get('templateType') || undefined,
      category: searchParams.get('category') || undefined,
      isCustom: searchParams.get('isCustom') ? searchParams.get('isCustom') === 'true' : undefined,
      isSystemTemplate: searchParams.get('isSystemTemplate') ? searchParams.get('isSystemTemplate') === 'true' : undefined,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 100,
      offset: searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0,
    };

    console.log('Data Quality Templates API: Getting templates with filters:', filters);

    const db = await getDatabase();
    
    // Check if table exists first
    const tableExists = await db.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'data_quality_templates'
      )`
    );
    
    if (!tableExists[0].exists) {
      console.log('Data Quality Templates API: Table does not exist yet, returning empty result');
      return successResponse({
        templates: [],
        total: 0,
        offset: filters.offset,
        limit: filters.limit
      });
    }
    
    let repository;
    try {
      repository = db.getRepository(DataQualityTemplateEntity);
    } catch {
      console.log('Data Quality Templates API: Entity not registered, returning empty results');
      return successResponse({
        templates: [],
        total: 0,
        offset: filters.offset,
        limit: filters.limit,
        message: 'Template entity not yet registered. Please restart the development server.'
      });
    }

    // Initialize system templates if none exist
    let templateCount = 0;
    try {
      templateCount = await repository.count();
      if (templateCount === 0) {
        console.log('No templates found, initializing system templates...');
        await initializeSystemTemplates(repository);
      }
    } catch {
      console.log('Data Quality Templates API: Could not count templates, table may not exist');
      return successResponse({
        templates: [],
        total: 0,
        offset: filters.offset,
        limit: filters.limit,
        message: 'Unable to access templates table. Please check database setup.'
      });
    }

    // Build query with filters
    const queryBuilder = repository.createQueryBuilder('template')
      .where('template.is_active = :isActive', { isActive: true })
      .orderBy('template.created_at', 'DESC');

    if (filters.templateType) {
      queryBuilder.andWhere('template.template_type = :templateType', { templateType: filters.templateType });
    }
    if (filters.category) {
      queryBuilder.andWhere('template.category = :category', { category: filters.category });
    }
    if (filters.isCustom !== undefined) {
      queryBuilder.andWhere('template.is_custom = :isCustom', { isCustom: filters.isCustom });
    }
    if (filters.isSystemTemplate !== undefined) {
      queryBuilder.andWhere('template.is_system_template = :isSystemTemplate', { isSystemTemplate: filters.isSystemTemplate });
    }

    // Get total count for pagination and execute query
    let total = 0;
    let templates = [];
    
    try {
      total = await queryBuilder.getCount();

      // Apply pagination
      if (filters.offset) {
        queryBuilder.offset(filters.offset);
      }
      if (filters.limit) {
        queryBuilder.limit(filters.limit);
      }

      templates = await queryBuilder.getMany();
    } catch (queryError) {
      console.log('Data Quality Templates API: Query failed, returning empty results:', queryError instanceof Error ? queryError.message : 'Unknown error');
      return successResponse({
        templates: [],
        total: 0,
        offset: filters.offset,
        limit: filters.limit,
        message: 'Database query failed. Table structure may be incorrect.'
      });
    }

    console.log('Data Quality Templates API: Returning', templates.length, 'templates');
    
    return successResponse({
      templates,
      total,
      offset: filters.offset,
      limit: filters.limit
    });
  } catch (error) {
    console.error('Data Quality Templates API Error:', error);
    return errorResponse(error, 'Failed to retrieve templates', 500);
  }
}, 'Failed to retrieve templates');

/**
 * POST /api/data-quality-templates
 * Create a new data quality template
 */
export const POST = withErrorHandler(async (request: NextRequest) => {
  try {
    const body = await request.json();
    console.log('Data Quality Templates API: Creating template with data:', body);
    
    // Basic validation
    if (!body.name || !body.methodName || !body.templateType || !body.category) {
      return errorResponse(new Error('Missing required fields'), 'Missing required fields: name, methodName, templateType, and category are required', 400);
    }

    const db = await getDatabase();
    
    // Check if table exists first
    const tableExists = await db.query(
      `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'data_quality_templates'
      )`
    );
    
    if (!tableExists[0].exists) {
      console.log('Data Quality Templates API: Table does not exist yet, migrations may need to run');
      return errorResponse(new Error('Table not ready'), 'Data quality templates table not ready. Please wait for migrations to complete.', 503);
    }
    
    const repository = db.getRepository(DataQualityTemplateEntity);

    // Check if template with this name already exists
    const existingTemplate = await repository.findOne({ where: { name: body.name } });
    if (existingTemplate) {
      return errorResponse(new Error('Template name conflict'), 'Template with this name already exists', 409);
    }

    // Create new template
    const template = repository.create({
      name: body.name,
      description: body.description || '',
      templateType: body.templateType as 'remediation' | 'normalization' | 'global',
      category: body.category as 'data_cleaning' | 'format_standardization' | 'statistical_normalization' | 'validation' | 'enrichment' | 'custom',
      methodName: body.methodName,
      parameters: body.parameters || {},
      configuration: body.configuration || {},
      applicableDataTypes: body.applicableDataTypes || [],
      applicableFieldPatterns: body.applicableFieldPatterns || [],
      confidenceThreshold: body.confidenceThreshold || 0.8,
      riskLevel: (body.riskLevel as 'low' | 'medium' | 'high') || 'medium',
      usageRecommendations: body.usageRecommendations || '',
      exampleBefore: body.exampleBefore || undefined,
      exampleAfter: body.exampleAfter || undefined,
      usageCount: 0,
      successRate: undefined,
      avgProcessingTimeMs: undefined,
      isSystemTemplate: false,
      isCustom: true,
      isActive: true,
      tags: body.tags || [],
      version: 1,
      createdBy: body.createdBy || 'user'
    });

    const savedTemplate = await repository.save(template);
    
    console.log('Data Quality Templates API: Created template:', savedTemplate.id);
    
    return successResponse(savedTemplate, 'Template created successfully', 201);
  } catch (error) {
    console.error('Data Quality Templates API Create Error:', error);
    return errorResponse(error, 'Failed to create template', 500);
  }
}, 'Failed to create template');

// Helper function to initialize system templates
async function initializeSystemTemplates(repository: Repository<DataQualityTemplateEntity>) {
  const systemTemplates = [
    // Remediation Templates
    {
      id: 'sys-template-1',
      name: 'Email Format Standardization',
      description: 'Normalizes emails to lowercase, removes spaces, validates format',
      templateType: 'remediation',
      category: 'format_standardization',
      methodName: 'standardize_email',
      parameters: { toLowerCase: true, removeSpaces: true, validateFormat: true },
      confidenceThreshold: 0.95,
      riskLevel: 'low',
      usageRecommendations: 'Use for email fields that need consistent formatting. Safe for all email data.',
      exampleBefore: 'John.DOE@EXAMPLE.COM ',
      exampleAfter: 'john.doe@example.com',
      usageCount: 156,
      successRate: 0.98,
      avgProcessingTimeMs: 125,
      isSystemTemplate: true,
      isCustom: false,
      tags: ['email', 'validation', 'format'],
      version: 1,
      createdBy: 'system',
      createdAt: new Date('2024-01-01').toISOString(),
      updatedAt: new Date('2024-01-01').toISOString()
    },
    {
      id: 'sys-template-2',
      name: 'Phone Number Standardization',
      description: 'Formats phone numbers to consistent pattern',
      templateType: 'remediation',
      category: 'format_standardization',
      methodName: 'standardize_phone',
      parameters: { format: '(XXX) XXX-XXXX', removeNonNumeric: true },
      applicableFieldPatterns: ['phone'],
      confidenceThreshold: 0.9,
      riskLevel: 'low',
      exampleBefore: '1234567890',
      exampleAfter: '(123) 456-7890',
      usageCount: 98,
      successRate: 0.92,
      avgProcessingTimeMs: 150,
      isSystemTemplate: true,
      isCustom: false,
      tags: ['phone', 'format'],
      version: 1,
      createdBy: 'system',
      createdAt: new Date('2024-01-01').toISOString(),
      updatedAt: new Date('2024-01-01').toISOString()
    },
    
    // Normalization Templates
    {
      id: 'sys-template-3',
      name: 'Z-Score Normalization',
      description: 'Standardizes data to have mean=0 and std=1. Best for normally distributed data.',
      templateType: 'normalization',
      category: 'statistical_normalization',
      methodName: 'z_score_normalize',
      configuration: { normalizationType: 'z-score', handleOutliers: true, outlierMethod: 'z-score' },
      applicableDataTypes: ['numeric'],
      confidenceThreshold: 0.9,
      riskLevel: 'low',
      usageRecommendations: 'Use when: 1) Data is normally distributed, 2) You need to compare features with different units, 3) Outliers are not extreme. Avoid when: Data has heavy outliers or is not normally distributed.',
      exampleBefore: [100, 200, 300, 400, 500],
      exampleAfter: [-1.41, -0.71, 0, 0.71, 1.41],
      usageCount: 89,
      successRate: 0.94,
      avgProcessingTimeMs: 450,
      isSystemTemplate: true,
      isCustom: false,
      tags: ['statistics', 'normalization', 'z-score'],
      version: 1,
      createdBy: 'system',
      createdAt: new Date('2024-01-01').toISOString(),
      updatedAt: new Date('2024-01-01').toISOString()
    },
    {
      id: 'sys-template-4',
      name: 'Min-Max Normalization',
      description: 'Scales data to a fixed range [0,1]. Preserves original distribution.',
      templateType: 'normalization',
      category: 'statistical_normalization',
      methodName: 'min_max_normalize',
      configuration: { normalizationType: 'min-max', scaleRange: [0, 1] },
      applicableDataTypes: ['numeric'],
      confidenceThreshold: 0.95,
      riskLevel: 'low',
      usageRecommendations: 'Use when: 1) You know the min/max bounds, 2) Data has uniform distribution, 3) You need values in specific range. Avoid when: Data has extreme outliers or unknown bounds.',
      exampleBefore: [100, 200, 300, 400, 500],
      exampleAfter: [0, 0.25, 0.5, 0.75, 1],
      usageCount: 124,
      successRate: 0.97,
      avgProcessingTimeMs: 320,
      isSystemTemplate: true,
      isCustom: false,
      tags: ['statistics', 'normalization', 'min-max', 'scaling'],
      version: 1,
      createdBy: 'system',
      createdAt: new Date('2024-01-01').toISOString(),
      updatedAt: new Date('2024-01-01').toISOString()
    },
    {
      id: 'sys-template-5',
      name: 'Robust Scaler Normalization',
      description: 'Uses median and IQR for scaling. Robust to outliers.',
      templateType: 'normalization',
      category: 'statistical_normalization',
      methodName: 'robust_scale_normalize',
      configuration: { normalizationType: 'robust', handleOutliers: true, outlierMethod: 'iqr' },
      applicableDataTypes: ['numeric'],
      confidenceThreshold: 0.88,
      riskLevel: 'low',
      usageRecommendations: 'Use when: 1) Data has significant outliers, 2) Distribution is skewed, 3) You need outlier-resistant scaling. Best choice for real-world messy data.',
      exampleBefore: [100, 200, 300, 400, 1000],
      exampleAfter: [-1, -0.5, 0, 0.5, 3.5],
      usageCount: 67,
      successRate: 0.91,
      avgProcessingTimeMs: 380,
      isSystemTemplate: true,
      isCustom: false,
      tags: ['statistics', 'normalization', 'robust', 'outliers'],
      version: 1,
      createdBy: 'system',
      createdAt: new Date('2024-01-01').toISOString(),
      updatedAt: new Date('2024-01-01').toISOString()
    },
    
    // Global Templates
    {
      id: 'sys-template-6',
      name: 'Remove Extra Whitespace',
      description: 'Removes leading, trailing, and extra spaces',
      templateType: 'global',
      category: 'data_cleaning',
      methodName: 'trim_whitespace',
      parameters: { trimStart: true, trimEnd: true, collapseSpaces: true },
      applicableDataTypes: ['string'],
      confidenceThreshold: 0.99,
      riskLevel: 'low',
      exampleBefore: '  Hello   World  ',
      exampleAfter: 'Hello World',
      usageCount: 324,
      successRate: 0.99,
      avgProcessingTimeMs: 50,
      isSystemTemplate: true,
      isCustom: false,
      tags: ['cleaning', 'whitespace', 'text'],
      version: 1,
      createdBy: 'system',
      createdAt: new Date('2024-01-01').toISOString(),
      updatedAt: new Date('2024-01-01').toISOString()
    },
    {
      id: 'sys-template-7',
      name: 'Date Format Standardization',
      description: 'Converts dates to ISO format (YYYY-MM-DD)',
      templateType: 'global',
      category: 'format_standardization',
      methodName: 'standardize_date',
      parameters: { outputFormat: 'YYYY-MM-DD', inferFormat: true },
      applicableDataTypes: ['date', 'string'],
      applicableFieldPatterns: ['date'],
      confidenceThreshold: 0.85,
      riskLevel: 'medium',
      usageRecommendations: 'Use for date fields that need consistent formatting. Will attempt to infer input format.',
      exampleBefore: '01/15/2024',
      exampleAfter: '2024-01-15',
      usageCount: 187,
      successRate: 0.88,
      avgProcessingTimeMs: 200,
      isSystemTemplate: true,
      isCustom: false,
      tags: ['date', 'format', 'iso'],
      version: 1,
      createdBy: 'system',
      createdAt: new Date('2024-01-01').toISOString(),
      updatedAt: new Date('2024-01-01').toISOString()
    }
  ];

  // Save all system templates to database
  for (const templateData of systemTemplates) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, createdAt, updatedAt, ...templateProps } = templateData;
    
    // Create the template using proper type casting
    const templateEntity = new DataQualityTemplateEntity();
    templateEntity.name = templateProps.name;
    templateEntity.description = templateProps.description;
    templateEntity.templateType = templateProps.templateType as 'remediation' | 'normalization' | 'global';
    templateEntity.category = templateProps.category as 'data_cleaning' | 'format_standardization' | 'statistical_normalization' | 'validation' | 'enrichment' | 'custom';
    templateEntity.methodName = templateProps.methodName;
    templateEntity.parameters = templateProps.parameters || {};
    
    // Handle configuration with proper typing
    if (templateProps.configuration) {
      const config = templateProps.configuration as Record<string, unknown>;
      if (config.normalizationType) {
        config.normalizationType = config.normalizationType as 'z-score' | 'min-max' | 'robust' | 'decimal-scaling' | 'log' | 'custom';
      }
      if (config.outlierMethod) {
        config.outlierMethod = config.outlierMethod as 'iqr' | 'z-score' | 'isolation-forest';
      }
      templateEntity.configuration = config;
    } else {
      templateEntity.configuration = {};
    }
    
    templateEntity.applicableDataTypes = templateProps.applicableDataTypes || [];
    templateEntity.applicableFieldPatterns = templateProps.applicableFieldPatterns || [];
    templateEntity.confidenceThreshold = templateProps.confidenceThreshold || 0.8;
    templateEntity.riskLevel = templateProps.riskLevel as 'low' | 'medium' | 'high';
    templateEntity.usageRecommendations = templateProps.usageRecommendations;
    
    // Handle examples properly
    if (Array.isArray(templateProps.exampleBefore)) {
      templateEntity.exampleBefore = { values: templateProps.exampleBefore };
    } else if (typeof templateProps.exampleBefore === 'object' && templateProps.exampleBefore !== null) {
      templateEntity.exampleBefore = templateProps.exampleBefore as Record<string, unknown>;
    } else if (templateProps.exampleBefore) {
      templateEntity.exampleBefore = { value: templateProps.exampleBefore };
    }
    
    if (Array.isArray(templateProps.exampleAfter)) {
      templateEntity.exampleAfter = { values: templateProps.exampleAfter };
    } else if (typeof templateProps.exampleAfter === 'object' && templateProps.exampleAfter !== null) {
      templateEntity.exampleAfter = templateProps.exampleAfter as Record<string, unknown>;
    } else if (templateProps.exampleAfter) {
      templateEntity.exampleAfter = { value: templateProps.exampleAfter };
    }
    
    templateEntity.usageCount = templateProps.usageCount || 0;
    templateEntity.successRate = templateProps.successRate || undefined;
    templateEntity.avgProcessingTimeMs = templateProps.avgProcessingTimeMs || undefined;
    templateEntity.isSystemTemplate = templateProps.isSystemTemplate || false;
    templateEntity.isCustom = templateProps.isCustom || false;
    templateEntity.tags = templateProps.tags || [];
    templateEntity.version = templateProps.version || 1;
    templateEntity.createdBy = templateProps.createdBy || 'system';
    templateEntity.isActive = true;

    const template = templateEntity;
    
    await repository.save(template);
  }

  console.log(`Initialized ${systemTemplates.length} system templates`);
}