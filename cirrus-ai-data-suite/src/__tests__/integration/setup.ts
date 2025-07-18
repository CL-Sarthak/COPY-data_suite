import { DataSource } from 'typeorm';
import { CatalogFieldEntity } from '@/entities/CatalogFieldEntity';
import { CatalogCategoryEntity } from '@/entities/CatalogCategoryEntity';
import { DataSourceEntity } from '@/entities/DataSourceEntity';
import { FieldMappingEntity } from '@/entities/FieldMappingEntity';
import { PatternEntity } from '@/entities/PatternEntity';
import { UploadSessionEntity } from '@/entities/UploadSessionEntity';
import { PipelineEntity } from '@/entities/PipelineEntity';
import { PatternFeedback } from '@/entities/PatternFeedback';
import { ProcessedFile } from '@/entities/ProcessedFile';
import { AnnotationSession } from '@/entities/AnnotationSession';
import { SyntheticDataset } from '@/entities/SyntheticDataset';
import { SyntheticDataJob } from '@/entities/SyntheticDataJob';
import { DatabaseConnectionEntity } from '@/entities/DatabaseConnectionEntity';

export async function createTestDataSource(): Promise<DataSource> {
  // Use PostgreSQL for integration tests too
  const testDbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  
  if (!testDbUrl) {
    throw new Error('TEST_DATABASE_URL or DATABASE_URL environment variable is required for integration tests');
  }

  const dataSource = new DataSource({
    type: 'postgres',
    url: testDbUrl,
    synchronize: false, // Don't auto-sync, use migrations
    logging: false,
    entities: [
      CatalogFieldEntity,
      CatalogCategoryEntity,
      DataSourceEntity,
      FieldMappingEntity,
      PatternEntity,
      UploadSessionEntity,
      PipelineEntity,
      PatternFeedback,
      ProcessedFile,
      AnnotationSession,
      SyntheticDataset,
      SyntheticDataJob,
      DatabaseConnectionEntity,
    ],
  });

  await dataSource.initialize();
  return dataSource;
}