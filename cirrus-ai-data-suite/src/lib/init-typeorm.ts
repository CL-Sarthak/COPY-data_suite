/**
 * TypeORM Initialization
 * This file MUST be imported before any entity imports to ensure reflect-metadata is loaded
 */
import 'reflect-metadata';

// Pre-load all entities to ensure decorators are processed
export async function preloadEntities() {
  // Import entities dynamically to ensure they're loaded after reflect-metadata
  const moduleImports = await Promise.all([
    import('@/entities/DataSourceEntity'),
    import('@/entities/PatternEntity'),
    import('@/entities/AnnotationSession'),
    import('@/entities/ProcessedFile'),
    import('@/entities/SyntheticDataset'),
    import('@/entities/SyntheticDataJob'),
    import('@/entities/CatalogFieldEntity'),
    import('@/entities/FieldMappingEntity'),
    import('@/entities/CatalogCategoryEntity'),
    import('@/entities/PipelineEntity'),
    import('@/entities/UploadSessionEntity'),
    import('@/entities/PatternFeedback'),
    import('@/entities/DatabaseConnectionEntity'),
    import('@/entities/ApiConnectionEntity'),
    import('@/entities/InboundApiConnectionEntity'),
    import('@/entities/DataSourceTableEntity'),
    import('@/entities/FieldAnnotationEntity'),
    import('@/entities/FieldRelationshipEntity'),
    // Data Quality entities - MUST be imported in correct order
    import('@/entities/QualityRuleEntity'),
    import('@/entities/RuleExecutionEntity'),
    import('@/entities/RemediationJobEntity'),
    import('@/entities/RemediationActionEntity'),
    import('@/entities/RemediationHistoryEntity'),
    import('@/entities/FixTemplateEntity'),
    import('@/entities/DataQualityTemplateEntity'),
  ]);

  // Extract entities by their specific export names
  const entities = [
    moduleImports[0].DataSourceEntity,
    moduleImports[1].PatternEntity,
    moduleImports[2].AnnotationSession,
    moduleImports[3].ProcessedFile,
    moduleImports[4].SyntheticDataset,
    moduleImports[5].SyntheticDataJob,
    moduleImports[6].CatalogFieldEntity,
    moduleImports[7].FieldMappingEntity,
    moduleImports[8].CatalogCategoryEntity,
    moduleImports[9].PipelineEntity,
    moduleImports[10].UploadSessionEntity,
    moduleImports[11].PatternFeedback,
    moduleImports[12].DatabaseConnectionEntity,
    moduleImports[13].ApiConnectionEntity,
    moduleImports[14].InboundApiConnectionEntity,
    moduleImports[15].DataSourceTableEntity,
    moduleImports[16].FieldAnnotationEntity,
    moduleImports[17].FieldRelationshipEntity,
    // Data Quality entities
    moduleImports[18].QualityRuleEntity,
    moduleImports[19].RuleExecutionEntity,
    moduleImports[20].RemediationJobEntity,
    moduleImports[21].RemediationActionEntity,
    moduleImports[22].RemediationHistoryEntity,
    moduleImports[23].FixTemplateEntity,
    moduleImports[24].DataQualityTemplateEntity,
  ];

  return entities;
}