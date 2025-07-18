// import { Repository, DataSource, In, Like, IsNull } from 'typeorm';
import { 
  FixTemplate, 
  CreateFixTemplateRequest,
  UpdateFixTemplateRequest,
  FixTemplateCategory,
  TemplateParameter,
  TemplateValidation,
  RiskLevel,
  FixMethod
} from '@/types/remediation';
import { FixResult, FixContext } from '@/services/autoFixEngine';
import { FixTemplateEntity } from '@/entities/FixTemplateEntity';
import { RemediationActionEntity } from '@/entities/RemediationActionEntity';
import { getDatabase } from '@/database/connection';
import { AutoFixEngine } from './autoFixEngine';

/**
 * Fix Template Service
 * Manages reusable transformation patterns for data quality remediation
 */
export class FixTemplateService {
  private async getRepositories() {
    const db = await getDatabase();
    return {
      templateRepository: db.getRepository(FixTemplateEntity),
      actionRepository: db.getRepository(RemediationActionEntity)
    };
  }

  // ==================== SYSTEM TEMPLATES ====================

  /**
   * Initialize system templates on first run
   */
  async initializeSystemTemplates(): Promise<FixTemplate[]> {
    const { templateRepository } = await this.getRepositories();
    const existingSystemTemplates = await templateRepository.find({
      where: { isSystemTemplate: true }
    });

    if (existingSystemTemplates.length > 0) {
      return existingSystemTemplates.map(t => this.convertToFixTemplate(t));
    }

    const systemTemplates = this.getSystemTemplates();
    const savedTemplates: FixTemplateEntity[] = [];
    
    for (const template of systemTemplates) {
      const entity = new FixTemplateEntity();
      Object.assign(entity, template);
      entity.isSystemTemplate = true;
      entity.createdBy = 'system';
      entity.isActive = true;
      
      const saved = await templateRepository.save(entity);
      savedTemplates.push(saved);
    }
    
    return savedTemplates.map(t => this.convertToFixTemplate(t));
  }

  /**
   * Get predefined system templates
   */
  private getSystemTemplates(): Partial<FixTemplate>[] {
    return [
      // Data Cleaning Templates
      {
        name: 'Clean Text Field',
        description: 'Remove extra whitespace and special characters from text fields',
        category: 'data_cleaning',
        fixMethod: 'clean_text_combo',
        parameters: {
          trimWhitespace: { type: 'boolean', default: true, required: true },
          removeExtraSpaces: { type: 'boolean', default: true, required: true },
          removeSpecialChars: { type: 'boolean', default: false, required: false },
          preserveChars: { type: 'array', default: ['-', '_', '.'], required: false }
        },
        applicableFieldTypes: ['string', 'text'],
        confidenceThreshold: 0.85
      },
      {
        name: 'Standardize Case - Title',
        description: 'Convert text to title case (first letter of each word capitalized)',
        category: 'data_cleaning',
        fixMethod: 'standardize_case',
        parameters: {
          caseType: { type: 'string', default: 'title', required: true, enum: ['upper', 'lower', 'title', 'sentence'] }
        },
        applicableFieldTypes: ['string', 'text'],
        confidenceThreshold: 0.9
      },
      
      // Format Standardization Templates
      {
        name: 'Email Standardization',
        description: 'Standardize email addresses to lowercase and validate format',
        category: 'format_standardization',
        fixMethod: 'standardize_email',
        parameters: {},
        applicableFieldTypes: ['email', 'string'],
        confidenceThreshold: 0.9
      },
      {
        name: 'US Phone Number Format',
        description: 'Format US phone numbers to international format',
        category: 'format_standardization',
        fixMethod: 'standardize_phone',
        parameters: {
          format: { type: 'string', default: 'international', required: true, enum: ['international', 'national', 'digits'] },
          country: { type: 'string', default: 'US', required: true }
        },
        applicableFieldTypes: ['phone', 'string'],
        confidenceThreshold: 0.8
      },
      {
        name: 'Date Format - ISO',
        description: 'Convert dates to ISO format (YYYY-MM-DD)',
        category: 'format_standardization',
        fixMethod: 'standardize_date',
        parameters: {
          targetFormat: { type: 'string', default: 'YYYY-MM-DD', required: true }
        },
        applicableFieldTypes: ['date', 'datetime', 'string'],
        confidenceThreshold: 0.85
      },
      {
        name: 'Country Code - ISO2',
        description: 'Standardize country codes to ISO 2-letter format',
        category: 'format_standardization',
        fixMethod: 'standardize_country_code',
        parameters: {
          format: { type: 'string', default: 'iso2', required: true, enum: ['iso2', 'iso3', 'name'] }
        },
        applicableFieldTypes: ['country', 'string'],
        confidenceThreshold: 0.85
      },
      
      // Data Validation Templates
      {
        name: 'Fill Missing with Default',
        description: 'Fill missing values with a specified default value',
        category: 'data_validation',
        fixMethod: 'fill_missing_values',
        parameters: {
          strategy: { type: 'string', default: 'default', required: true },
          defaultValue: { type: 'string', default: 'N/A', required: false }
        },
        applicableFieldTypes: ['string', 'text', 'number', 'integer'],
        confidenceThreshold: 0.8
      },
      {
        name: 'Fill Missing with Mean',
        description: 'Fill missing numeric values with the mean of existing values',
        category: 'data_validation',
        fixMethod: 'fill_missing_values',
        parameters: {
          strategy: { type: 'string', default: 'mean', required: true }
        },
        applicableFieldTypes: ['number', 'integer', 'decimal'],
        confidenceThreshold: 0.7
      },
      {
        name: 'Numeric Range Validation',
        description: 'Ensure numeric values fall within a specified range',
        category: 'data_validation',
        fixMethod: 'validate_range',
        parameters: {
          min: { type: 'number', default: 0, required: true },
          max: { type: 'number', default: 100, required: true },
          strategy: { type: 'string', default: 'clamp', required: true, enum: ['clamp', 'flag'] }
        },
        applicableFieldTypes: ['number', 'integer', 'decimal'],
        confidenceThreshold: 0.6
      },
      
      // Business Logic Templates
      {
        name: 'Name Normalization',
        description: 'Normalize person names to proper case with cleaned formatting',
        category: 'business_logic',
        fixMethod: 'normalize_name',
        parameters: {
          removeMiddleInitials: { type: 'boolean', default: false, required: false },
          removeHonorifics: { type: 'boolean', default: false, required: false }
        },
        applicableFieldTypes: ['name', 'string'],
        confidenceThreshold: 0.7
      },
      {
        name: 'Address Standardization',
        description: 'Standardize address formatting and abbreviations',
        category: 'business_logic',
        fixMethod: 'standardize_address',
        parameters: {
          abbreviateStreetTypes: { type: 'boolean', default: true, required: false },
          abbreviateDirections: { type: 'boolean', default: true, required: false }
        },
        applicableFieldTypes: ['address', 'string'],
        confidenceThreshold: 0.75
      }
    ];
  }

  // ==================== TEMPLATE MANAGEMENT ====================

  /**
   * Create a new fix template
   */
  async createTemplate(request: CreateFixTemplateRequest): Promise<FixTemplate> {
    // Validate template structure
    const validation = this.validateTemplate(request);
    if (!validation.isValid) {
      throw new Error(`Invalid template: ${validation.errors.join(', ')}`);
    }

    const { templateRepository } = await this.getRepositories();
    const template = new FixTemplateEntity();
    template.id = crypto.randomUUID();
    template.name = request.name;
    template.description = request.description;
    template.category = request.category;
    template.fixMethod = request.fixMethod;
    template.parameters = request.parameters || {};
    template.applicableFieldTypes = request.applicableFieldTypes || [];
    template.confidenceThreshold = request.confidenceThreshold || 0.7;
    template.createdBy = request.createdBy;
    template.isSystemTemplate = false;
    template.usageCount = 0;
    template.createdAt = new Date();
    template.updatedAt = new Date();

    const savedTemplate = await templateRepository.save(template);
    return this.convertToFixTemplate(savedTemplate);
  }

  /**
   * Get template by ID
   */
  async getTemplateById(templateId: string): Promise<FixTemplate | null> {
    const { templateRepository } = await this.getRepositories();
    const template = await templateRepository.findOne({
      where: { id: templateId }
    });

    if (!template) return null;
    return this.convertToFixTemplate(template);
  }

  /**
   * Get all templates with filtering
   */
  async getTemplates(filters: {
    category?: FixTemplateCategory;
    applicableType?: string;
    search?: string;
    isSystemTemplate?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ templates: FixTemplate[]; total: number }> {
    const { templateRepository } = await this.getRepositories();
    const queryBuilder = templateRepository.createQueryBuilder('template')
      .orderBy('template.usageCount', 'DESC')
      .addOrderBy('template.createdAt', 'DESC');

    if (filters.category) {
      queryBuilder.andWhere('template.category = :category', { 
        category: filters.category 
      });
    }

    if (filters.applicableType) {
      queryBuilder.andWhere(':type = ANY(template.applicableFieldTypes)', { 
        type: filters.applicableType 
      });
    }

    if (filters.search) {
      queryBuilder.andWhere(
        '(LOWER(template.name) LIKE LOWER(:search) OR LOWER(template.description) LIKE LOWER(:search))',
        { search: `%${filters.search}%` }
      );
    }

    if (filters.isSystemTemplate !== undefined) {
      queryBuilder.andWhere('template.isSystemTemplate = :isSystem', { 
        isSystem: filters.isSystemTemplate 
      });
    }

    if (filters.limit) {
      queryBuilder.limit(filters.limit);
    }

    if (filters.offset) {
      queryBuilder.offset(filters.offset);
    }

    const [templates, total] = await queryBuilder.getManyAndCount();

    return {
      templates: templates.map(t => this.convertToFixTemplate(t)),
      total
    };
  }

  /**
   * Update an existing template
   */
  async updateTemplate(
    templateId: string, 
    request: UpdateFixTemplateRequest
  ): Promise<FixTemplate | null> {
    const { templateRepository } = await this.getRepositories();
    const template = await templateRepository.findOne({
      where: { id: templateId }
    });

    if (!template) return null;

    // Don't allow updating system templates
    if (template.isSystemTemplate) {
      throw new Error('System templates cannot be modified');
    }

    // Validate if structure changes are made
    if (request.parameters || request.fixMethod) {
      const validation = this.validateTemplate({
        ...template,
        category: template.category as FixTemplateCategory,
        parameters: (template.parameters as Record<string, TemplateParameter>) || {},
        ...request
      });
      if (!validation.isValid) {
        throw new Error(`Invalid template update: ${validation.errors.join(', ')}`);
      }
    }

    // Update allowed fields
    if (request.name !== undefined) template.name = request.name;
    if (request.description !== undefined) template.description = request.description;
    if (request.category !== undefined) template.category = request.category;
    if (request.parameters !== undefined) template.parameters = request.parameters;
    if (request.applicableFieldTypes !== undefined) template.applicableFieldTypes = request.applicableFieldTypes;
    if (request.confidenceThreshold !== undefined) template.confidenceThreshold = request.confidenceThreshold;

    template.updatedAt = new Date();

    const savedTemplate = await templateRepository.save(template);
    return this.convertToFixTemplate(savedTemplate);
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId: string): Promise<boolean> {
    const { templateRepository } = await this.getRepositories();
    const template = await templateRepository.findOne({
      where: { id: templateId }
    });

    if (!template) return false;

    // Don't allow deleting system templates
    if (template.isSystemTemplate) {
      throw new Error('System templates cannot be deleted');
    }

    await templateRepository.delete({ id: templateId });
    return true;
  }

  // ==================== TEMPLATE USAGE ====================

  /**
   * Apply a template to create remediation actions
   */
  async applyTemplate(
    templateId: string,
    values: unknown[],
    context: {
      fieldName: string;
      fieldType: string;
      jobId?: string;
    }
  ): Promise<{
    actions: unknown[];
    summary: {
      total: number;
      successful: number;
      failed: number;
      averageConfidence: number;
    };
  }> {
    const { templateRepository } = await this.getRepositories();
    const template = await templateRepository.findOne({
      where: { id: templateId }
    });

    if (!template) {
      throw new Error('Template not found');
    }

    const actions: unknown[] = [];
    let successful = 0;
    let failed = 0;
    let totalConfidence = 0;

    for (const value of values) {
      try {
        // Apply the fix method with template parameters
        const fixResult = await this.applyFixMethod(
          template.fixMethod,
          value,
          template.parameters || {},
          {
            fieldName: context.fieldName,
            fieldType: context.fieldType,
            recordId: context.jobId
          }
        );

        if (fixResult.success) {
          successful++;
          totalConfidence += fixResult.confidence;
          
          actions.push({
            originalValue: value,
            suggestedValue: fixResult.fixedValue,
            fixMethod: template.fixMethod,
            confidence: Math.max(fixResult.confidence, template.confidenceThreshold),
            templateId: template.id,
            metadata: {
              templateName: template.name,
              fixResult
            }
          });
        } else {
          failed++;
        }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_error) {
        failed++;
      }
    }

    // Update template usage statistics
    template.usageCount = (template.usageCount || 0) + values.length;
    if (successful > 0) {
      const currentSuccessRate = template.successRate || 0;
      const currentTotal = template.usageCount - values.length;
      const newSuccessRate = ((currentSuccessRate * currentTotal) + successful) / template.usageCount;
      template.successRate = Math.round(newSuccessRate * 1000) / 1000;
    }
    template.updatedAt = new Date();
    await templateRepository.save(template);

    return {
      actions,
      summary: {
        total: values.length,
        successful,
        failed,
        averageConfidence: successful > 0 ? totalConfidence / successful : 0
      }
    };
  }

  /**
   * Get template suggestions for a field
   */
  async getTemplateSuggestions(
    fieldType: string,
    sampleValues: unknown[],
    fieldName?: string
  ): Promise<{
    templateId: string;
    score: number;
    reasoning: string;
  }[]> {
    // Get all templates applicable to this field type
    const { templates } = await this.getTemplates({
      applicableType: fieldType
    });

    const suggestions: { templateId: string; score: number; reasoning: string; }[] = [];

    for (const template of templates) {
      let score = 0;
      const reasons: string[] = [];

      // Type compatibility score
      if (template.applicableFieldTypes?.includes(fieldType)) {
        score += 0.3;
        reasons.push(`Designed for ${fieldType} fields`);
      }

      // Field name semantic matching
      if (fieldName && template.name.toLowerCase().includes(fieldName.toLowerCase())) {
        score += 0.2;
        reasons.push('Field name matches template purpose');
      }

      // Success rate score
      if (template.successRate && template.successRate > 0.8) {
        score += 0.2;
        reasons.push(`High success rate: ${Math.round(template.successRate * 100)}%`);
      }

      // Usage popularity score
      if (template.usageCount && template.usageCount > 10) {
        score += 0.1;
        reasons.push(`Popular template (${template.usageCount} uses)`);
      }

      // Test template on sample values
      if (sampleValues.length > 0) {
        const testResults = await this.testTemplateOnSamples(template, sampleValues.slice(0, 5));
        if (testResults.successRate > 0.6) {
          score += 0.2;
          reasons.push(`Works well on sample data (${Math.round(testResults.successRate * 100)}% success)`);
        }
      }

      if (score > 0) {
        suggestions.push({
          templateId: template.id,
          score: Math.round(score * 100) / 100,
          reasoning: reasons.join('; ')
        });
      }
    }

    // Sort by score descending
    return suggestions.sort((a, b) => b.score - a.score);
  }

  /**
   * Clone a template
   */
  async cloneTemplate(
    templateId: string,
    newName: string,
    createdBy: string
  ): Promise<FixTemplate> {
    const { templateRepository } = await this.getRepositories();
    const originalTemplate = await templateRepository.findOne({
      where: { id: templateId }
    });

    if (!originalTemplate) {
      throw new Error('Template not found');
    }

    const clonedTemplate = new FixTemplateEntity();
    clonedTemplate.id = crypto.randomUUID();
    clonedTemplate.name = newName;
    clonedTemplate.description = `${originalTemplate.description} (cloned from ${originalTemplate.name})`;
    clonedTemplate.category = originalTemplate.category;
    clonedTemplate.fixMethod = originalTemplate.fixMethod;
    clonedTemplate.parameters = { ...originalTemplate.parameters };
    clonedTemplate.applicableFieldTypes = originalTemplate.applicableFieldTypes ? [...originalTemplate.applicableFieldTypes] : [];
    clonedTemplate.confidenceThreshold = originalTemplate.confidenceThreshold;
    clonedTemplate.createdBy = createdBy;
    clonedTemplate.isSystemTemplate = false;
    clonedTemplate.usageCount = 0;
    clonedTemplate.createdAt = new Date();
    clonedTemplate.updatedAt = new Date();

    const savedTemplate = await templateRepository.save(clonedTemplate);
    return this.convertToFixTemplate(savedTemplate);
  }

  // ==================== TEMPLATE ANALYTICS ====================

  /**
   * Get template usage statistics
   */
  async getTemplateStatistics(templateId: string): Promise<{
    usageCount: number;
    successRate: number;
    lastUsed?: Date;
    popularFields: Array<{ fieldName: string; count: number }>;
    averageConfidence: number;
  } | null> {
    const { templateRepository, actionRepository } = await this.getRepositories();
    const template = await templateRepository.findOne({
      where: { id: templateId }
    });

    if (!template) return null;

    // Get recent actions using this template
    const recentActions = await actionRepository
      .createQueryBuilder('action')
      .where('action.metadata->\'templateId\' = :templateId', { templateId })
      .orderBy('action.createdAt', 'DESC')
      .limit(100)
      .getMany();

    // Calculate statistics
    const fieldUsage: Record<string, number> = {};
    let totalConfidence = 0;
    let lastUsed: Date | undefined;

    for (const action of recentActions) {
      const fieldName = action.metadata?.fieldContext?.fieldName;
      if (fieldName) {
        fieldUsage[fieldName] = (fieldUsage[fieldName] || 0) + 1;
      }
      
      totalConfidence += action.confidence || 0;
      
      if (!lastUsed || action.createdAt > lastUsed) {
        lastUsed = action.createdAt;
      }
    }

    const popularFields = Object.entries(fieldUsage)
      .map(([fieldName, count]) => ({ fieldName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      usageCount: template.usageCount || 0,
      successRate: template.successRate || 0,
      lastUsed,
      popularFields,
      averageConfidence: recentActions.length > 0 
        ? totalConfidence / recentActions.length 
        : template.confidenceThreshold
    };
  }

  /**
   * Get most used templates
   */
  async getMostUsedTemplates(
    limit: number = 10,
    includeSystemTemplates: boolean = true
  ): Promise<FixTemplate[]> {
    const { templateRepository } = await this.getRepositories();
    const queryBuilder = templateRepository.createQueryBuilder('template')
      .where('template.usageCount > 0')
      .andWhere('template.isActive = true')
      .orderBy('template.usageCount', 'DESC')
      .limit(limit);

    if (!includeSystemTemplates) {
      queryBuilder.andWhere('template.isSystemTemplate = false');
    }

    const templates = await queryBuilder.getMany();
    return templates.map(t => this.convertToFixTemplate(t));
  }

  /**
   * Suggest templates for a field based on type and sample data
   */
  async suggestTemplates(
    fieldType: string,
    fieldName?: string,
    sampleData: unknown[] = [],
    limit: number = 5
  ): Promise<FixTemplate[]> {
    // Get all active templates
    const { templates } = await this.getTemplates({
      limit: 50 // Get more for better scoring
    });

    const suggestions: Array<{ template: FixTemplate; score: number }> = [];

    for (const template of templates) {
      let score = 0;
      
      // Base compatibility score
      if (template.applicableFieldTypes?.includes(fieldType) || 
          template.applicableFieldTypes?.includes('string') ||
          !template.applicableFieldTypes?.length) {
        score += 0.3;
      }

      // Field name semantic matching
      if (fieldName) {
        const nameWords = fieldName.toLowerCase().split(/[_-]/);
        const templateWords = template.name.toLowerCase().split(/\s+/);
        
        for (const nameWord of nameWords) {
          for (const templateWord of templateWords) {
            if (nameWord.includes(templateWord) || templateWord.includes(nameWord)) {
              score += 0.2;
              break;
            }
          }
        }
      }

      // Usage-based scoring
      if (template.successRate && template.successRate > 0.7) {
        score += 0.2 * template.successRate;
      }

      if (template.usageCount && template.usageCount > 5) {
        score += Math.min(0.1, template.usageCount / 100);
      }

      // Test on sample data if available
      if (sampleData.length > 0) {
        const testResult = await this.testTemplateOnSamples(template, sampleData.slice(0, 3));
        if (testResult.successRate > 0.5) {
          score += 0.2 * testResult.successRate;
        }
      }

      // Field type specific bonuses
      if (fieldType === 'email' && template.name.toLowerCase().includes('email')) {
        score += 0.15;
      }
      if (fieldType === 'phone' && template.name.toLowerCase().includes('phone')) {
        score += 0.15;
      }
      if (fieldType === 'date' && template.name.toLowerCase().includes('date')) {
        score += 0.15;
      }

      if (score > 0.1) { // Only include templates with meaningful score
        suggestions.push({ template, score });
      }
    }

    // Sort by score descending and return top suggestions
    return suggestions
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(s => s.template);
  }

  // ==================== HELPER METHODS ====================

  /**
   * Validate template structure
   */
  private validateTemplate(template: Partial<FixTemplate>): TemplateValidation {
    const errors: string[] = [];

    if (!template.name || template.name.trim().length === 0) {
      errors.push('Template name is required');
    }

    if (!template.fixMethod) {
      errors.push('Fix method is required');
    }

    if (!template.category) {
      errors.push('Category is required');
    }

    if (template.parameters) {
      for (const [paramName, paramDef] of Object.entries(template.parameters)) {
        const param = paramDef as TemplateParameter;
        if (!param.type) {
          errors.push(`Parameter ${paramName} must have a type`);
        }
        
        if (param.type === 'string' && param.enum && !Array.isArray(param.enum)) {
          errors.push(`Parameter ${paramName} enum must be an array`);
        }
      }
    }

    if (template.confidenceThreshold !== undefined) {
      if (template.confidenceThreshold < 0 || template.confidenceThreshold > 1) {
        errors.push('Confidence baseline must be between 0 and 1');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Apply fix method with template parameters
   */
  private async applyFixMethod(
    method: string,
    value: unknown,
    parameters: Record<string, unknown>,
    context: FixContext
  ): Promise<FixResult> {
    // Special handling for composite methods
    if (method === 'clean_text_combo') {
      const startTime = Date.now();
      let result: FixResult = { 
        success: false, 
        originalValue: value, 
        fixedValue: value, 
        confidence: 0, 
        method: method as FixMethod,
        metadata: {
          reasoning: 'Composite text cleaning operation',
          riskLevel: 'low' as RiskLevel,
          reversible: true,
          dataLoss: false,
          executionTime: 0
        }
      };
      
      if (parameters.trimWhitespace) {
        result = AutoFixEngine.trimWhitespace(value, context);
        if (result.success) value = result.fixedValue;
      }
      
      if (parameters.removeExtraSpaces && result.success) {
        const spaceResult = AutoFixEngine.removeExtraSpaces(value, context);
        if (spaceResult.success) {
          value = spaceResult.fixedValue;
          result.fixedValue = value;
          result.confidence = Math.max(result.confidence, spaceResult.confidence);
        }
      }
      
      if (parameters.removeSpecialChars) {
        const specialResult = AutoFixEngine.removeSpecialCharacters(
          value, 
          { preserve: (parameters.preserveChars as string[]) || [] }, 
          context
        );
        if (specialResult.success) {
          result.fixedValue = specialResult.fixedValue;
          result.confidence = Math.max(result.confidence, specialResult.confidence);
          result.success = true;
        }
      }
      
      // Update metadata with final execution time and data loss status
      result.metadata.executionTime = Date.now() - startTime;
      result.metadata.dataLoss = result.originalValue !== result.fixedValue && 
                                 (!!parameters.removeSpecialChars || !!parameters.removeExtraSpaces);
      
      return result;
    }

    // Direct method mapping
    switch (method) {
      case 'trim_whitespace':
        return AutoFixEngine.trimWhitespace(value, context);
      
      case 'standardize_case':
        return AutoFixEngine.standardizeCase(value, (parameters.caseType as 'upper' | 'lower' | 'title' | 'sentence') || 'title', context);
      
      case 'standardize_email':
        return AutoFixEngine.standardizeEmail(value, context);
      
      case 'standardize_phone':
        return AutoFixEngine.standardizePhone(value, parameters, context);
      
      case 'standardize_date':
        return AutoFixEngine.standardizeDate(value, parameters.targetFormat as string, context);
      
      case 'standardize_country_code':
        return AutoFixEngine.standardizeCountryCode(value, (parameters.format as 'iso2' | 'iso3' | 'name') || 'iso2', context);
      
      case 'fill_missing_values':
        return AutoFixEngine.fillMissingValues(value, (parameters.strategy as 'mean' | 'median' | 'mode' | 'default' | 'forward_fill') || 'default', parameters, context);
      
      case 'validate_range':
        return AutoFixEngine.validateRange(
          value, 
          parameters.min as number, 
          parameters.max as number, 
          (parameters.strategy as 'clamp' | 'flag') || 'clamp', 
          context
        );
      
      default:
        throw new Error(`Unknown fix method: ${method}`);
    }
  }

  /**
   * Test template on sample values
   */
  private async testTemplateOnSamples(
    template: FixTemplate,
    samples: unknown[]
  ): Promise<{ successRate: number; avgConfidence: number }> {
    let successful = 0;
    let totalConfidence = 0;

    for (const value of samples) {
      try {
        const result = await this.applyFixMethod(
          template.fixMethod,
          value,
          template.parameters || {},
          { 
            fieldName: 'test_field',
            fieldType: 'test' 
          }
        );
        
        if (result.success) {
          successful++;
          totalConfidence += result.confidence;
        }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_error) {
        // Ignore errors in testing
      }
    }

    return {
      successRate: samples.length > 0 ? successful / samples.length : 0,
      avgConfidence: successful > 0 ? totalConfidence / successful : 0
    };
  }

  /**
   * Convert entity to domain model
   */
  private convertToFixTemplate(entity: FixTemplateEntity): FixTemplate {
    return {
      id: entity.id,
      name: entity.name,
      description: entity.description,
      category: entity.category as FixTemplateCategory,
      fixMethod: entity.fixMethod,
      parameters: (entity.parameters as Record<string, TemplateParameter>) || {},
      applicableFieldTypes: entity.applicableFieldTypes || [],
      confidenceThreshold: entity.confidenceThreshold,
      usageCount: entity.usageCount,
      successRate: entity.successRate,
      createdBy: entity.createdBy,
      isSystemTemplate: entity.isSystemTemplate,
      clonedFrom: entity.clonedFrom,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt
    };
  }
}