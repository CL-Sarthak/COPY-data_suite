// CRITICAL: Import reflect-metadata before anything else
import '@/lib/init-typeorm';
import { DataSource } from 'typeorm';
import { logger } from '@/utils/logger';
import { MigrationTracker } from './migrationTracker';
import { ConsistentNamingStrategy } from './naming-strategy';
import { registerEntity } from '@/utils/typeorm-production';
import { preloadEntities } from '@/lib/init-typeorm';
import { validateAllEntities } from '@/utils/entity-validator';
import { fixEntityMetadata } from '@/utils/entity-metadata-fix';

// Import the single comprehensive migration
import { CompleteSchema1750000001000 } from './migrations/001_complete_schema';
import { FixPipelineTable1750000039000 } from './migrations/039_fix_pipeline_table';
import { AddDatabaseConnections1706200000040 } from './migrations/040_add_database_connections';
import { AddPatternTypeColumn1750000041000 } from './migrations/041_add_pattern_type_column';
import { AddMissingPatternColumns1735790800000 } from '../migrations/042_add_missing_pattern_columns';
import { AddRegexPatternsColumn1735790900000 } from '../migrations/043_add_regex_patterns_column';
import { AddAllMissingPatternColumns1735791000000 } from '../migrations/044_add_all_missing_pattern_columns';
import { CleanupPatternTypeColumn1735791100000 } from '../migrations/045_cleanup_pattern_type_column';
import { AddRefreshColumnsToDatabaseConnections1706200000046 } from './migrations/046_add_refresh_columns_to_database_connections';
import { AddApiConnections1736307600000 } from './migrations/050_add_api_connections';
import { AddContextKeywordsToPatterns1736307700000 } from './migrations/051_add_context_keywords_to_patterns';
import { AddMetadataToPatterns1736307800000 } from './migrations/052_add_metadata_to_patterns';
import { CreateInboundApiConnections029 } from '../migrations/029_CreateInboundApiConnections';
import { AddDataModeToInboundApi030 } from '../migrations/030_AddDataModeToInboundApi';
import { AddCustomUrlToInboundApi031 } from '../migrations/031_AddCustomUrlToInboundApi';
import { AddDataSourceSummaries053 } from '../database/migrations/053_add_data_source_summaries';
import { AddTableLevelSummaries054 } from '../database/migrations/054_add_table_level_summaries';
import { AddFieldAnnotations055 } from '../database/migrations/055_add_field_annotations';
import { AddKeywordsToDataSources1736619000000 } from '../migrations/055_add_keywords_to_data_sources';
import { AddDataQualityTables1736500000000 } from './migrations/060_add_data_quality_tables';

// Define global type for TypeORM persistence
declare global {
  // eslint-disable-next-line no-var
  var typeormDataSource: DataSource | undefined;
  // eslint-disable-next-line no-var
  var typeormInitialized: boolean | undefined;
  // eslint-disable-next-line no-var
  var mockNormalizationJobs: Array<{
    id: string;
    name: string;
    dataSourceId: string;
    dataSourceName: string;
    status: 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
    totalRecords: number;
    normalizedRecords: number;
    skippedRecords: number;
    confidence: number;
    operationType: 'normalization';
    templatesApplied: string[];
    createdAt: string;
    completedAt?: string;
    startedAt?: string;
    cancelledAt?: string;
    description?: string;
    createdBy?: string;
  }> | undefined;
}

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

import type { EntityTarget, ObjectLiteral } from 'typeorm';

// Global entities array that persists across hot reloads
let entities: EntityTarget<ObjectLiteral>[] = [];

// Entity name to class mapping for recovery
const ENTITY_CLASS_MAP = new Map<string, EntityTarget<ObjectLiteral>>();

// Import entities with dynamic imports to avoid circular dependencies
import { DataSourceEntity } from '@/entities/DataSourceEntity';
import { PatternEntity } from '@/entities/PatternEntity';
import { AnnotationSession } from '@/entities/AnnotationSession';
import { ProcessedFile } from '@/entities/ProcessedFile';
import { SyntheticDataset } from '@/entities/SyntheticDataset';
import { SyntheticDataJob } from '@/entities/SyntheticDataJob';
import { CatalogFieldEntity } from '@/entities/CatalogFieldEntity';
import { FieldMappingEntity } from '@/entities/FieldMappingEntity';
import { CatalogCategoryEntity } from '@/entities/CatalogCategoryEntity';
import { PipelineEntity } from '@/entities/PipelineEntity';
import { UploadSessionEntity } from '@/entities/UploadSessionEntity';
import { PatternFeedback } from '@/entities/PatternFeedback';
import { DatabaseConnectionEntity } from '@/entities/DatabaseConnectionEntity';
import { ApiConnectionEntity } from '@/entities/ApiConnectionEntity';
import { InboundApiConnectionEntity } from '@/entities/InboundApiConnectionEntity';
import { DataSourceTableEntity } from '@/entities/DataSourceTableEntity';
import { FieldAnnotationEntity } from '@/entities/FieldAnnotationEntity';
import { FieldRelationshipEntity } from '@/entities/FieldRelationshipEntity';
// Data Quality entities
import { QualityRuleEntity } from '@/entities/QualityRuleEntity';
import { RuleExecutionEntity } from '@/entities/RuleExecutionEntity';
import { RemediationJobEntity } from '@/entities/RemediationJobEntity';
import { RemediationActionEntity } from '@/entities/RemediationActionEntity';
import { RemediationHistoryEntity } from '@/entities/RemediationHistoryEntity';
import { FixTemplateEntity } from '@/entities/FixTemplateEntity';
import { DataQualityTemplateEntity } from '@/entities/DataQualityTemplateEntity';

// Initialize entities if not in browser
if (typeof window === 'undefined') {
  
  entities = [
    DataSourceEntity,
    PatternEntity,
    AnnotationSession,
    ProcessedFile,
    SyntheticDataset,
    SyntheticDataJob,
    CatalogFieldEntity,
    FieldMappingEntity,
    CatalogCategoryEntity,
    PipelineEntity,
    UploadSessionEntity,
    PatternFeedback,
    DatabaseConnectionEntity,
    ApiConnectionEntity,
    InboundApiConnectionEntity,
    DataSourceTableEntity,
    FieldAnnotationEntity,
    FieldRelationshipEntity,
    // Data Quality entities
    QualityRuleEntity,
    RuleExecutionEntity,
    RemediationJobEntity,
    RemediationActionEntity,
    RemediationHistoryEntity,
    FixTemplateEntity,
    DataQualityTemplateEntity
  ];
  
  // Populate entity class map
  entities.forEach(entity => {
    const entityName = (entity as { name: string }).name;
    ENTITY_CLASS_MAP.set(entityName, entity);
  });
}

// PostgreSQL-only configuration
const getDatabaseConfig = async () => {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required. Please configure PostgreSQL.');
  }

  // Ensure entities are loaded
  if (entities.length === 0) {
    logger.warn('Entities not loaded, loading dynamically...');
    entities = await preloadEntities();
    
    // Populate entity class map
    entities.forEach(entity => {
      const entityName = (entity as { name: string }).name;
      ENTITY_CLASS_MAP.set(entityName, entity);
    });
    
    logger.info(`Dynamically loaded ${entities.length} entities:`, entities.map(e => (e as { name: string }).name));
    
    // Validate entities
    validateAllEntities(entities);
  }

  logger.info('Using PostgreSQL database');
  logger.debug(`Entities configured: ${entities.length}`);
  
  return {
    type: 'postgres' as const,
    url: databaseUrl,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    entities: entities as any[], // Cast to compatible type for TypeORM
    migrations: [],
    migrationsRun: false,
    synchronize: false, // Never auto-sync in production
    logging: process.env.DB_LOGGING === 'true',
    ssl: process.env.DATABASE_SSL !== 'false' ? { rejectUnauthorized: false } : false,
    namingStrategy: new ConsistentNamingStrategy(),
  };
};

// Single instance for production
let productionDataSource: DataSource | null = null;

// Get the current DataSource
const getCurrentDataSource = async (): Promise<DataSource> => {
  if (isDevelopment) {
    // In development, use global instance to survive hot reloads
    if (!global.typeormDataSource) {
      logger.debug('Creating new DataSource for development');
      const config = await getDatabaseConfig();
      global.typeormDataSource = new DataSource(config);
    }
    
    // In development, if DataSource is initialized but has no metadata, recreate it
    if (global.typeormDataSource.isInitialized && global.typeormDataSource.entityMetadatas.length === 0) {
      logger.warn('Development: DataSource initialized but no metadata, recreating...');
      await global.typeormDataSource.destroy();
      const config = await getDatabaseConfig();
      global.typeormDataSource = new DataSource(config);
      // Reset initialization flag to force re-init
      global.typeormInitialized = false;
    }
    
    return global.typeormDataSource;
  } else {
    // In production, create a single instance
    if (!productionDataSource) {
      const config = await getDatabaseConfig();
      productionDataSource = new DataSource(config);
    }
    return productionDataSource;
  }
};

// Export a getter so it always returns the current instance
export const getAppDataSource = async () => getCurrentDataSource();

// For backward compatibility - Note: This will need to be awaited
export const AppDataSource = getCurrentDataSource();

// Initialize the database connection
let isInitialized = isDevelopment ? (global.typeormInitialized || false) : false;

// Track if migrations were run at build time
const SKIP_RUNTIME_MIGRATIONS = process.env.SKIP_RUNTIME_MIGRATIONS === 'true';

export const initializeDatabase = async () => {
  // Get the current isInitialized state
  isInitialized = isDevelopment ? (global.typeormInitialized || false) : isInitialized;
  
  if (!isInitialized) {
    try {
      const dataSource = await getCurrentDataSource();
      
      // Check if already initialized before trying to initialize
      if (!dataSource.isInitialized) {
        logger.info('Initializing DataSource...');
        logger.debug('DataSource options:', {
          type: dataSource.options.type,
          entityCount: Array.isArray(dataSource.options.entities) ? dataSource.options.entities.length : 0,
          entities: Array.isArray(dataSource.options.entities) 
            ? dataSource.options.entities.map((e) => typeof e === 'function' ? e.name : e)
            : 'Not an array'
        });
        await dataSource.initialize();
      }
      
      // Log metadata status
      logger.info(`DataSource initialized with ${dataSource.entityMetadatas.length} entity metadata`);
      logger.debug('Entity metadata:', dataSource.entityMetadatas.map(m => ({
        name: m.name,
        tableName: m.tableName,
        target: typeof m.target === 'function' ? m.target.name : m.target
      })));
      
      // Debug remediation entities specifically
      const remediationEntities = dataSource.entityMetadatas.filter(m => 
        m.name.includes('Remediation') || m.tableName.includes('remediation')
      );
      logger.debug('Remediation entities found:', remediationEntities.map(m => ({
        name: m.name,
        tableName: m.tableName,
        relations: m.relations.map(r => ({
          propertyName: r.propertyName,
          type: r.relationType,
          inversePropertyPath: r.inverseSidePropertyPath
        }))
      })));
      
      // Apply entity metadata fix
      fixEntityMetadata(dataSource);
      
      if (dataSource.entityMetadatas.length === 0) {
        logger.error('CRITICAL: No entity metadata found after initialization!');
        logger.error('Options entities:', Array.isArray(dataSource.options.entities) 
          ? dataSource.options.entities.map((e) => typeof e === 'function' ? e.name : e)
          : 'Not an array');
        logger.error('Global entities array:', entities.map(e => (e as { name: string }).name));
        
        // Try to manually register entities
        logger.info('Attempting manual entity registration...');
        const entityTableMap = {
          'DataSourceEntity': 'data_source_entity',
          'PatternEntity': 'patterns',
          'AnnotationSession': 'annotation_sessions',
          'ProcessedFile': 'processed_files',
          'SyntheticDataset': 'synthetic_datasets',
          'SyntheticDataJob': 'synthetic_data_jobs',
          'CatalogFieldEntity': 'catalog_field',
          'FieldMappingEntity': 'field_mapping',
          'CatalogCategoryEntity': 'catalog_category',
          'PipelineEntity': 'pipeline',
          'UploadSessionEntity': 'upload_sessions',
          'PatternFeedback': 'pattern_feedback',
          'DatabaseConnectionEntity': 'database_connections',
          'ApiConnectionEntity': 'api_connections',
          'InboundApiConnectionEntity': 'inbound_api_connections',
          'DataSourceTableEntity': 'data_source_tables',
          'FieldAnnotationEntity': 'field_annotations',
          'FieldRelationshipEntity': 'field_relationships',
          // Data Quality entities
          'QualityRuleEntity': 'quality_rules',
          'RuleExecutionEntity': 'rule_executions',
          'RemediationJobEntity': 'remediation_jobs',
          'RemediationActionEntity': 'remediation_actions',
          'RemediationHistoryEntity': 'remediation_history',
          'FixTemplateEntity': 'fix_templates',
          'DataQualityTemplateEntity': 'data_quality_templates'
        };
        
        entities.forEach((entity) => {
          const entityName = (entity as { name: string }).name;
          const tableName = entityTableMap[entityName as keyof typeof entityTableMap] || entityName.toLowerCase();
          registerEntity(entity, tableName);
          logger.debug(`Manually registered ${entityName} with table ${tableName}`);
        });
      } else {
        // Register entities for production fallback
        entities.forEach((entity, index) => {
          const entityName = (entity as { name: string }).name;
          const tableName = dataSource.entityMetadatas[index]?.tableName || entityName.toLowerCase();
          registerEntity(entity, tableName);
        });
      }
      
      // Check if critical tables exist before skipping migrations
      let criticalTablesExist = false;
      try {
        const tableCheck = await dataSource.query(`
          SELECT COUNT(*) as count 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'data_source_entity'
        `);
        criticalTablesExist = tableCheck[0].count > 0;
      } catch (error) {
        logger.warn('Could not check for critical tables:', error);
      }
      
      // Skip migrations only if they were run at build time AND tables exist
      if (SKIP_RUNTIME_MIGRATIONS && isProduction && criticalTablesExist) {
        logger.info('Migrations were run at build time and tables exist, skipping runtime migrations');
        isInitialized = true;
        if (isDevelopment) {
          global.typeormInitialized = true;
        }
        return dataSource;
      } else if (SKIP_RUNTIME_MIGRATIONS && isProduction && !criticalTablesExist) {
        logger.warn('SKIP_RUNTIME_MIGRATIONS is set but critical tables are missing, running migrations anyway');
      }
      
      // Run the single comprehensive migration
      await MigrationTracker.checkAndRunMigration(
        dataSource,
        '001_complete_schema',
        async () => {
          const migration = new CompleteSchema1750000001000();
          const queryRunner = dataSource.createQueryRunner();
          await migration.up(queryRunner);
          await queryRunner.release();
        }
      );
      
      // Fix pipeline table structure
      await MigrationTracker.checkAndRunMigration(
        dataSource,
        '039_fix_pipeline_table',
        async () => {
          const migration = new FixPipelineTable1750000039000();
          const queryRunner = dataSource.createQueryRunner();
          await migration.up(queryRunner);
          await queryRunner.release();
        }
      );
      
      // Add database connections table
      await MigrationTracker.checkAndRunMigration(
        dataSource,
        '040_add_database_connections',
        async () => {
          const migration = new AddDatabaseConnections1706200000040();
          const queryRunner = dataSource.createQueryRunner();
          await migration.up(queryRunner);
          await queryRunner.release();
        }
      );
      
      // Add pattern type column
      await MigrationTracker.checkAndRunMigration(
        dataSource,
        '041_add_pattern_type_column',
        async () => {
          const migration = new AddPatternTypeColumn1750000041000();
          const queryRunner = dataSource.createQueryRunner();
          await migration.up(queryRunner);
          await queryRunner.release();
        }
      );
      
      // Add missing pattern columns
      await MigrationTracker.checkAndRunMigration(
        dataSource,
        '042_add_missing_pattern_columns',
        async () => {
          const migration = new AddMissingPatternColumns1735790800000();
          const queryRunner = dataSource.createQueryRunner();
          await migration.up(queryRunner);
          await queryRunner.release();
        }
      );
      
      // Add regex_patterns column
      await MigrationTracker.checkAndRunMigration(
        dataSource,
        '043_add_regex_patterns_column',
        async () => {
          const migration = new AddRegexPatternsColumn1735790900000();
          const queryRunner = dataSource.createQueryRunner();
          await migration.up(queryRunner);
          await queryRunner.release();
        }
      );
      
      // Add all missing pattern columns
      await MigrationTracker.checkAndRunMigration(
        dataSource,
        '044_add_all_missing_pattern_columns',
        async () => {
          const migration = new AddAllMissingPatternColumns1735791000000();
          const queryRunner = dataSource.createQueryRunner();
          await migration.up(queryRunner);
          await queryRunner.release();
        }
      );
      
      // Cleanup old pattern_type column
      await MigrationTracker.checkAndRunMigration(
        dataSource,
        '045_cleanup_pattern_type_column',
        async () => {
          const migration = new CleanupPatternTypeColumn1735791100000();
          const queryRunner = dataSource.createQueryRunner();
          await migration.up(queryRunner);
          await queryRunner.release();
        }
      );
      
      // Add refresh columns to database connections
      await MigrationTracker.checkAndRunMigration(
        dataSource,
        '046_add_refresh_columns_to_database_connections',
        async () => {
          const migration = new AddRefreshColumnsToDatabaseConnections1706200000046();
          const queryRunner = dataSource.createQueryRunner();
          await migration.up(queryRunner);
          await queryRunner.release();
        }
      );
      
      // Add API connections table
      await MigrationTracker.checkAndRunMigration(
        dataSource,
        '050_add_api_connections',
        async () => {
          const migration = new AddApiConnections1736307600000();
          const queryRunner = dataSource.createQueryRunner();
          await migration.up(queryRunner);
          await queryRunner.release();
        }
      );
      
      // Add context keywords to patterns
      await MigrationTracker.checkAndRunMigration(
        dataSource,
        '051_add_context_keywords_to_patterns',
        async () => {
          const migration = new AddContextKeywordsToPatterns1736307700000();
          const queryRunner = dataSource.createQueryRunner();
          await migration.up(queryRunner);
          await queryRunner.release();
        }
      );
      
      // Add metadata to patterns
      await MigrationTracker.checkAndRunMigration(
        dataSource,
        '052_add_metadata_to_patterns',
        async () => {
          const migration = new AddMetadataToPatterns1736307800000();
          const queryRunner = dataSource.createQueryRunner();
          await migration.up(queryRunner);
          await queryRunner.release();
        }
      );
      
      // Add Inbound API connections table
      await MigrationTracker.checkAndRunMigration(
        dataSource,
        '029_create_inbound_api_connections',
        async () => {
          const migration = new CreateInboundApiConnections029();
          const queryRunner = dataSource.createQueryRunner();
          await migration.up(queryRunner);
          await queryRunner.release();
        }
      );
      
      // Add data_mode column to inbound API connections
      await MigrationTracker.checkAndRunMigration(
        dataSource,
        '030_add_data_mode_to_inbound_api',
        async () => {
          const migration = new AddDataModeToInboundApi030();
          const queryRunner = dataSource.createQueryRunner();
          await migration.up(queryRunner);
          await queryRunner.release();
        }
      );
      
      // Add custom URL support to inbound API connections
      await MigrationTracker.checkAndRunMigration(
        dataSource,
        '031_add_custom_url_to_inbound_api',
        async () => {
          const migration = new AddCustomUrlToInboundApi031();
          const queryRunner = dataSource.createQueryRunner();
          await migration.up(queryRunner);
          await queryRunner.release();
        }
      );
      
      // Add data source summaries
      await MigrationTracker.checkAndRunMigration(
        dataSource,
        '053_add_data_source_summaries',
        async () => {
          const migration = new AddDataSourceSummaries053();
          const queryRunner = dataSource.createQueryRunner();
          await migration.up(queryRunner);
          await queryRunner.release();
        }
      );

      // Add table level summaries
      await MigrationTracker.checkAndRunMigration(
        dataSource,
        '054_add_table_level_summaries',
        async () => {
          const migration = new AddTableLevelSummaries054();
          const queryRunner = dataSource.createQueryRunner();
          await migration.up(queryRunner);
          await queryRunner.release();
        }
      );
      
      // Add field annotations
      await MigrationTracker.checkAndRunMigration(
        dataSource,
        '055_add_field_annotations',
        async () => {
          const migration = new AddFieldAnnotations055();
          const queryRunner = dataSource.createQueryRunner();
          await migration.up(queryRunner);
          await queryRunner.release();
        }
      );
      
      // Add keywords to data sources
      await MigrationTracker.checkAndRunMigration(
        dataSource,
        '056_add_keywords_to_data_sources',
        async () => {
          const migration = new AddKeywordsToDataSources1736619000000();
          const queryRunner = dataSource.createQueryRunner();
          await migration.up(queryRunner);
          await queryRunner.release();
        }
      );
      
      // Add data quality tables
      await MigrationTracker.checkAndRunMigration(
        dataSource,
        '060_add_data_quality_tables',
        async () => {
          const migration = new AddDataQualityTables1736500000000();
          const queryRunner = dataSource.createQueryRunner();
          await migration.up(queryRunner);
          await queryRunner.release();
        }
      );
      
      isInitialized = true;
      if (isDevelopment) {
        global.typeormInitialized = true;
      }
      
      logger.info('PostgreSQL database connection initialized successfully');
      
      // Log table count for debugging
      if (process.env.DB_LOGGING === 'true') {
        const tables = await dataSource.query(
          "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
        );
        logger.debug(`Found ${tables.length} tables:`, tables.map((t: { table_name: string }) => t.table_name));
      }
    } catch (error) {
      logger.error('Error during database initialization:', error);
      isInitialized = false;
      if (isDevelopment) {
        global.typeormInitialized = false;
      }
      throw error;
    }
  }
  
  return await getCurrentDataSource();
};

export const getDatabase = async (): Promise<DataSource> => {
  try {
    const dataSource = await getCurrentDataSource();
    
    // Get current initialization state
    isInitialized = isDevelopment ? (global.typeormInitialized || false) : isInitialized;
    
    // Check if the connection pool was closed (common with hot reloading)
    try {
      // Try a simple query to test the connection
      if (dataSource.isInitialized) {
        await dataSource.query('SELECT 1');
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('Cannot use a pool after calling end on the pool')) {
        logger.warn('Database connection pool was closed, resetting connection');
        isInitialized = false;
        if (isDevelopment) {
          global.typeormInitialized = false;
          // Close and recreate the data source
          try {
            await dataSource.destroy();
          } catch {}
          const config = await getDatabaseConfig();
          global.typeormDataSource = new DataSource(config);
        } else {
          try {
            await dataSource.destroy();
          } catch {}
          const config = await getDatabaseConfig();
          productionDataSource = new DataSource(config);
        }
      }
    }
    
    logger.debug(`getDatabase called - initialized: ${isInitialized}, dataSource.isInitialized: ${dataSource.isInitialized}, metadata count: ${dataSource.entityMetadatas.length}`);
    
    // In development, check if hot reload cleared metadata
    if (isDevelopment && dataSource.isInitialized && dataSource.entityMetadatas.length === 0) {
      logger.warn('Hot reload detected: Entity metadata lost, resetting connection');
      
      // Close existing connection
      await dataSource.destroy();
      
      // Create new DataSource
      const config = await getDatabaseConfig();
      global.typeormDataSource = new DataSource(config);
      
      // Reset initialization flags
      isInitialized = false;
      global.typeormInitialized = false;
    }
    
    // Check if metadata is missing even though we think we're initialized
    if (isInitialized && dataSource.entityMetadatas.length === 0) {
      logger.warn('Metadata missing despite initialization flag, forcing re-init');
      isInitialized = false;
      if (isDevelopment) {
        global.typeormInitialized = false;
      }
      
      // If DataSource thinks it's initialized but has no metadata, destroy and recreate
      if (dataSource.isInitialized) {
        await dataSource.destroy();
        if (isDevelopment) {
          const config = await getDatabaseConfig();
      global.typeormDataSource = new DataSource(config);
        } else {
          const config = await getDatabaseConfig();
          productionDataSource = new DataSource(config);
        }
      }
    }
    
    // Check if DataSource is initialized but our flag is out of sync
    if (dataSource.isInitialized && !isInitialized && dataSource.entityMetadatas.length > 0) {
      logger.debug('DataSource already initialized with metadata, syncing flags');
      isInitialized = true;
      if (isDevelopment) {
        global.typeormInitialized = true;
      }
    }
    
    if (!isInitialized) {
      await initializeDatabase();
    }
    
    const finalDataSource = await getCurrentDataSource();
    logger.debug(`getDatabase returning - metadata count: ${finalDataSource.entityMetadatas.length}`);
    
    // In development, validate that individual entity metadata is accessible
    if (isDevelopment && finalDataSource.entityMetadatas.length > 0) {
      try {
        // Test if we can access metadata for a key entity
        finalDataSource.getMetadata(DataSourceEntity);
        logger.debug('Development: Entity metadata validation passed');
      } catch (metadataError) {
        logger.error('Development: Entity metadata validation failed, forcing re-initialization:', metadataError);
        // Force complete re-initialization
        if (finalDataSource.isInitialized) {
          await finalDataSource.destroy();
        }
        delete global.typeormDataSource;
        global.typeormInitialized = false;
        
        // Recursively call getDatabase to start fresh
        return getDatabase();
      }
    }
    
    return finalDataSource;
  } catch (error) {
    logger.error('Critical database error:', error instanceof Error ? error.message : 'Unknown error');
    throw error;
  }
};