import { 
  Repository, 
  EntityTarget, 
  ObjectLiteral, 
  FindManyOptions, 
  FindOneOptions,
  DeepPartial,
  SaveOptions,
  DeleteResult,
  UpdateResult,
  InsertResult,
  QueryRunner
} from 'typeorm';
import { getDatabase } from './connection';
import { logger } from '@/utils/logger';

/**
 * Safe repository wrapper that handles metadata errors gracefully
 * by re-establishing the connection when needed
 */
export class SafeRepositoryWrapper<T extends ObjectLiteral> implements Partial<Repository<T>> {
  constructor(
    private entity: EntityTarget<T>,
    private repository: Repository<T>
  ) {}

  private async executeWithRetry<R>(
    operation: (repo: Repository<T>) => Promise<R>
  ): Promise<R> {
    try {
      return await operation(this.repository);
    } catch (error) {
      if (error instanceof Error && (error.message?.includes('No metadata') || error.name === 'EntityMetadataNotFoundError')) {
        logger.warn('Metadata error detected, attempting to recover...');
        
        // Get a fresh connection
        const db = await getDatabase();
        this.repository = db.getRepository(this.entity);
        
        // Retry the operation
        return await operation(this.repository);
      }
      throw error;
    }
  }

  async find(options?: FindManyOptions<T>): Promise<T[]> {
    return this.executeWithRetry(repo => repo.find(options));
  }

  async findOne(options: FindOneOptions<T>): Promise<T | null> {
    return this.executeWithRetry(repo => repo.findOne(options));
  }

  async save(entity: DeepPartial<T>, options?: SaveOptions): Promise<T>;
  async save(entities: DeepPartial<T>[], options?: SaveOptions): Promise<T[]>;
  async save(
    entityOrEntities: DeepPartial<T> | DeepPartial<T>[], 
    options?: SaveOptions
  ): Promise<T | T[]> {
    return this.executeWithRetry(repo => repo.save(entityOrEntities as never, options as never));
  }

  create(): T;
  create(plainEntity: DeepPartial<T>): T;
  create(plainEntities: DeepPartial<T>[]): T[];
  create(
    plainEntityOrEntities?: DeepPartial<T> | DeepPartial<T>[]
  ): T | T[] {
    if (plainEntityOrEntities === undefined) {
      return this.repository.create();
    }
    if (Array.isArray(plainEntityOrEntities)) {
      return this.repository.create(plainEntityOrEntities);
    }
    return this.repository.create(plainEntityOrEntities);
  }

  async delete(criteria: Parameters<Repository<T>['delete']>[0]): Promise<DeleteResult> {
    return this.executeWithRetry(repo => repo.delete(criteria));
  }

  async update(criteria: Parameters<Repository<T>['update']>[0], partialEntity: Parameters<Repository<T>['update']>[1]): Promise<UpdateResult> {
    return this.executeWithRetry(repo => repo.update(criteria, partialEntity));
  }

  async count(options?: FindManyOptions<T>): Promise<number> {
    return this.executeWithRetry(repo => repo.count(options));
  }

  async insert(entity: Parameters<Repository<T>['insert']>[0]): Promise<InsertResult> {
    return this.executeWithRetry(repo => repo.insert(entity));
  }

  get target(): EntityTarget<T> {
    return this.repository.target;
  }

  get manager() {
    return this.repository.manager;
  }

  get metadata() {
    return this.repository.metadata;
  }

  createQueryBuilder(alias?: string, queryRunner?: QueryRunner) {
    return this.repository.createQueryBuilder(alias, queryRunner);
  }
}

/**
 * Create a safe repository wrapper
 */
export function createSafeRepository<T extends ObjectLiteral>(
  entity: EntityTarget<T>,
  repository: Repository<T>
): SafeRepositoryWrapper<T> {
  return new SafeRepositoryWrapper(entity, repository);
}