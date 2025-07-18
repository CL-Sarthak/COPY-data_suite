import { getDatabase } from '@/database/connection';
import { FieldAnnotationEntity } from '@/entities/FieldAnnotationEntity';
import { FieldRelationshipEntity } from '@/entities/FieldRelationshipEntity';
import { logger } from '@/utils/logger';

export interface FieldAnnotationData {
  dataSourceId: string;
  fieldPath: string;
  fieldName: string;
  semanticType?: string;
  description?: string;
  businessContext?: string;
  dataType?: string;
  isPII?: boolean;
  piiType?: string;
  sensitivityLevel?: string;
  tags?: string[];
  isNullable?: boolean;
  isUnique?: boolean;
  exampleValues?: string[];
  metadata?: Record<string, unknown>;
}

export interface FieldRelationshipData {
  sourceFieldId: string;
  targetFieldId: string;
  relationshipType: string;
  description?: string;
  confidence?: number;
  isVerified?: boolean;
  metadata?: Record<string, unknown>;
}

export class FieldAnnotationService {
  static async createOrUpdate(data: FieldAnnotationData): Promise<FieldAnnotationEntity> {
    const database = await getDatabase();
    const repository = database.getRepository(FieldAnnotationEntity);

    try {
      // Check if annotation already exists
      let annotation = await repository.findOne({
        where: {
          dataSourceId: data.dataSourceId,
          fieldPath: data.fieldPath
        }
      });

      if (annotation) {
        // Update existing annotation
        Object.assign(annotation, data);
      } else {
        // Create new annotation
        annotation = repository.create(data);
      }

      return await repository.save(annotation);
    } catch (error) {
      logger.error('Error creating/updating field annotation:', error);
      throw error;
    }
  }

  static async bulkCreateOrUpdate(annotations: FieldAnnotationData[]): Promise<FieldAnnotationEntity[]> {
    const database = await getDatabase();
    const repository = database.getRepository(FieldAnnotationEntity);

    try {
      const results: FieldAnnotationEntity[] = [];

      // Process in batches to avoid overwhelming the database
      const batchSize = 50;
      for (let i = 0; i < annotations.length; i += batchSize) {
        const batch = annotations.slice(i, i + batchSize);
        
        // Get existing annotations for this batch
        const existingAnnotations = await repository.find({
          where: batch.map(a => ({
            dataSourceId: a.dataSourceId,
            fieldPath: a.fieldPath
          }))
        });

        // Create a map for quick lookup
        const existingMap = new Map(
          existingAnnotations.map(a => [`${a.dataSourceId}:${a.fieldPath}`, a])
        );

        // Process each annotation in the batch
        const toSave: FieldAnnotationEntity[] = [];
        for (const data of batch) {
          const key = `${data.dataSourceId}:${data.fieldPath}`;
          const existing = existingMap.get(key);

          if (existing) {
            Object.assign(existing, data);
            toSave.push(existing);
          } else {
            toSave.push(repository.create(data));
          }
        }

        const saved = await repository.save(toSave);
        results.push(...saved);
      }

      return results;
    } catch (error) {
      logger.error('Error bulk creating/updating field annotations:', error);
      throw error;
    }
  }

  static async getByDataSource(dataSourceId: string): Promise<FieldAnnotationEntity[]> {
    const database = await getDatabase();
    const repository = database.getRepository(FieldAnnotationEntity);

    return await repository.find({
      where: { dataSourceId },
      order: { fieldPath: 'ASC' }
    });
  }

  static async getByFieldPath(dataSourceId: string, fieldPath: string): Promise<FieldAnnotationEntity | null> {
    const database = await getDatabase();
    const repository = database.getRepository(FieldAnnotationEntity);

    return await repository.findOne({
      where: { dataSourceId, fieldPath }
    });
  }

  static async getById(id: string): Promise<FieldAnnotationEntity | null> {
    const database = await getDatabase();
    const repository = database.getRepository(FieldAnnotationEntity);

    return await repository.findOne({
      where: { id }
    });
  }

  static async updateById(id: string, data: Partial<FieldAnnotationData>): Promise<FieldAnnotationEntity | null> {
    const database = await getDatabase();
    const repository = database.getRepository(FieldAnnotationEntity);

    const annotation = await repository.findOne({
      where: { id }
    });

    if (!annotation) {
      return null;
    }

    Object.assign(annotation, data);
    return await repository.save(annotation);
  }

  static async searchAnnotations(query: string): Promise<FieldAnnotationEntity[]> {
    const database = await getDatabase();
    const repository = database.getRepository(FieldAnnotationEntity);

    // Search in field name, description, tags, etc.
    const qb = repository.createQueryBuilder('annotation');
    
    qb.where('annotation.field_name ILIKE :query', { query: `%${query}%` })
      .orWhere('annotation.description ILIKE :query', { query: `%${query}%` })
      .orWhere('annotation.business_context ILIKE :query', { query: `%${query}%` })
      .orWhere('annotation.tags::text ILIKE :query', { query: `%${query}%` });

    return await qb.getMany();
  }

  static async delete(id: string): Promise<void> {
    const database = await getDatabase();
    const repository = database.getRepository(FieldAnnotationEntity);

    await repository.delete(id);
  }

  static async deleteByDataSource(dataSourceId: string): Promise<void> {
    const database = await getDatabase();
    const repository = database.getRepository(FieldAnnotationEntity);

    await repository.delete({ dataSourceId });
  }

  // Field relationship methods
  static async createRelationship(data: FieldRelationshipData): Promise<FieldRelationshipEntity> {
    const database = await getDatabase();
    const repository = database.getRepository(FieldRelationshipEntity);

    try {
      // Check if relationship already exists
      let relationship = await repository.findOne({
        where: {
          sourceFieldId: data.sourceFieldId,
          targetFieldId: data.targetFieldId
        }
      });

      if (relationship) {
        Object.assign(relationship, data);
      } else {
        relationship = repository.create(data);
      }

      return await repository.save(relationship);
    } catch (error) {
      logger.error('Error creating field relationship:', error);
      throw error;
    }
  }

  static async getRelationshipsByField(fieldId: string): Promise<FieldRelationshipEntity[]> {
    const database = await getDatabase();
    const repository = database.getRepository(FieldRelationshipEntity);

    const [outgoing, incoming] = await Promise.all([
      repository.find({
        where: { sourceFieldId: fieldId },
        relations: ['targetField']
      }),
      repository.find({
        where: { targetFieldId: fieldId },
        relations: ['sourceField']
      })
    ]);

    return [...outgoing, ...incoming];
  }

  static async deleteRelationship(id: string): Promise<void> {
    const database = await getDatabase();
    const repository = database.getRepository(FieldRelationshipEntity);

    await repository.delete(id);
  }

  // Auto-detect PII fields based on field names and content
  static async detectPIIFields(dataSourceId: string, sampleData?: Array<Record<string, unknown>>): Promise<Partial<FieldAnnotationData>[]> {
    const piiPatterns = [
      { pattern: /ssn|social.*security/i, type: 'ssn', sensitivity: 'restricted' },
      { pattern: /email|e-mail/i, type: 'email', sensitivity: 'confidential' },
      { pattern: /phone|mobile|cell/i, type: 'phone', sensitivity: 'confidential' },
      { pattern: /name|firstname|lastname|surname/i, type: 'name', sensitivity: 'confidential' },
      { pattern: /address|street|city|zip|postal/i, type: 'address', sensitivity: 'confidential' },
      { pattern: /dob|birth.*date|birthdate/i, type: 'date_of_birth', sensitivity: 'restricted' },
      { pattern: /credit.*card|card.*number/i, type: 'credit_card', sensitivity: 'restricted' },
      { pattern: /passport/i, type: 'passport', sensitivity: 'restricted' },
      { pattern: /driver.*license|license.*number/i, type: 'drivers_license', sensitivity: 'restricted' },
      { pattern: /bank.*account|account.*number/i, type: 'bank_account', sensitivity: 'restricted' }
    ];

    const suggestions: Partial<FieldAnnotationData>[] = [];

    if (sampleData && sampleData.length > 0) {
      const fields = Object.keys(sampleData[0]);

      for (const field of fields) {
        for (const { pattern, type, sensitivity } of piiPatterns) {
          if (pattern.test(field)) {
            suggestions.push({
              fieldPath: field,
              fieldName: field,
              isPII: true,
              piiType: type,
              sensitivityLevel: sensitivity,
              semanticType: 'pii',
              tags: ['auto-detected', 'pii', type]
            });
            break;
          }
        }
      }
    }

    return suggestions;
  }

  static async getAllAnnotations(): Promise<FieldAnnotationEntity[]> {
    const database = await getDatabase();
    const repository = database.getRepository(FieldAnnotationEntity);

    return await repository.find({
      order: { dataSourceId: 'ASC', fieldPath: 'ASC' }
    });
  }
}