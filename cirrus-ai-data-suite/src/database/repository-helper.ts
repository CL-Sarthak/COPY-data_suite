import { EntityTarget, ObjectLiteral, Repository, DataSource } from 'typeorm';
import { getDatabase } from './connection';
import { logger } from '@/utils/logger';
import { getRepositoryWithFallback, isMetadataLoaded } from '@/utils/typeorm-production';
import { createSafeRepository } from './safe-repository-wrapper';

/**
 * Safely get a repository with automatic retry on metadata errors
 */
export async function getRepository<T extends ObjectLiteral>(
  entity: EntityTarget<T>
): Promise<Repository<T>> {
  const maxRetries = 3;
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const db = await getDatabase();
      
      // Check if metadata exists
      if (!isMetadataLoaded(db)) {
        logger.warn(`No metadata loaded in DataSource on attempt ${attempt}`);
        
        // Force reconnection in development
        if (process.env.NODE_ENV === 'development') {
          // This will trigger metadata reload
          const globalDataSource = (global as { typeormDataSource?: unknown }).typeormDataSource;
          if (globalDataSource && typeof globalDataSource === 'object' && 'isInitialized' in globalDataSource && globalDataSource.isInitialized) {
            await (globalDataSource as DataSource).destroy();
            delete (global as { typeormDataSource?: unknown }).typeormDataSource;
            delete (global as { typeormInitialized?: unknown }).typeormInitialized;
          }
          
          // Get fresh connection
          const freshDb = await getDatabase();
          // Use fallback method that handles metadata issues
          return getRepositoryWithFallback(freshDb, entity);
        }
      }
      
      // Use fallback method that handles metadata issues
      const repo = await getRepositoryWithFallback(db, entity);
      // Wrap in safe repository for development
      if (process.env.NODE_ENV === 'development') {
        return createSafeRepository(entity, repo) as unknown as Repository<T>;
      }
      return repo;
    } catch (error) {
      lastError = error as Error;
      logger.error(`Failed to get repository on attempt ${attempt}:`, error);
      
      if (attempt < maxRetries) {
        // Wait a bit before retrying
        await new Promise(resolve => setTimeout(resolve, 100 * attempt));
      }
    }
  }
  
  throw lastError || new Error('Failed to get repository after retries');
}

/**
 * Execute a repository operation with automatic retry
 */
export async function withRepository<T extends ObjectLiteral, R>(
  entity: EntityTarget<T>,
  operation: (repo: Repository<T>) => Promise<R>
): Promise<R> {
  const repository = await getRepository(entity);
  return operation(repository);
}