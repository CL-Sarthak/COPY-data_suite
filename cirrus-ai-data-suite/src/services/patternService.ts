import { PatternEntity } from '@/entities/PatternEntity';
import { getRepository, withRepository } from '@/database/repository-helper';

export interface Pattern {
  id: string;
  name: string;
  type: 'PII' | 'FINANCIAL' | 'MEDICAL' | 'CLASSIFICATION' | 'CUSTOM';
  category: string;
  regex?: string;
  regexPatterns?: string[]; // Multiple regex patterns
  examples: string[];
  contextKeywords?: string[]; // Keywords that should appear near matches for context validation
  description: string;
  color: string;
  isActive: boolean;
  metadata?: string; // JSON string for storing additional pattern metadata (e.g., cluster info)
  createdAt: Date;
}

export class PatternService {
  static async createPattern(pattern: Omit<Pattern, 'id' | 'createdAt'>): Promise<Pattern> {
    try {
      const entity = new PatternEntity();
      entity.name = pattern.name;
      entity.type = pattern.type;
      entity.category = pattern.category;
      entity.regex = pattern.regex || '';
      entity.regexPatterns = pattern.regexPatterns ? JSON.stringify(pattern.regexPatterns) : '[]';
      entity.examples = JSON.stringify(pattern.examples);
      entity.contextKeywords = pattern.contextKeywords ? JSON.stringify(pattern.contextKeywords) : '[]';
      entity.metadata = pattern.metadata || '{}';
      entity.description = pattern.description;
      entity.color = pattern.color || '#6B7280'; // Default gray color
      entity.isActive = pattern.isActive !== false; // Default to true if undefined
      
      // Initialize fields with defaults
      entity.feedbackCount = 0;
      entity.positiveCount = 0;
      entity.negativeCount = 0;
      entity.confidenceThreshold = 0.7;
      entity.autoRefineThreshold = 3;
      
      console.log('Creating pattern entity with values:', {
        name: entity.name,
        type: entity.type,
        category: entity.category,
        regex: entity.regex,
        regexPatterns: entity.regexPatterns,
        examples: entity.examples,
        description: entity.description,
        color: entity.color,
        isActive: entity.isActive,
        feedbackCount: entity.feedbackCount,
        positiveCount: entity.positiveCount,
        negativeCount: entity.negativeCount,
        confidenceThreshold: entity.confidenceThreshold,
        autoRefineThreshold: entity.autoRefineThreshold
      });

      const repository = await getRepository(PatternEntity);
      const saved = await repository.save(entity);

      return {
        id: saved.id,
        name: saved.name,
        type: saved.type as Pattern['type'],
        category: saved.category,
        regex: saved.regex || undefined,
        regexPatterns: saved.regexPatterns ? JSON.parse(saved.regexPatterns) : undefined,
        examples: typeof saved.examples === 'string' ? JSON.parse(saved.examples) : saved.examples,
        contextKeywords: saved.contextKeywords ? JSON.parse(saved.contextKeywords) : undefined,
        metadata: saved.metadata || undefined,
        description: saved.description,
        color: saved.color,
        isActive: saved.isActive,
        createdAt: saved.createdAt
      };
    } catch (error) {
      // If metadata error in development, suggest restart
      if (error instanceof Error && error.message.includes('No metadata') && process.env.NODE_ENV === 'development') {
        throw new Error('TypeORM metadata lost due to hot module reloading. Please restart the development server.');
      }
      throw new Error(`Failed to create pattern: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static async getAllPatterns(): Promise<Pattern[]> {
    try {
      console.log('PatternService.getAllPatterns: Using TypeORM repository...');
      const entities = await withRepository(PatternEntity, async (repository) => {
        return repository.find({
          order: { createdAt: 'DESC' }
        });
      });
      console.log(`PatternService.getAllPatterns: Successfully fetched ${entities.length} patterns`);
      
      return entities.map(entity => {
        try {
          return {
            id: entity.id,
            name: entity.name,
            type: entity.type as Pattern['type'],
            category: entity.category,
            regex: entity.regex || undefined,
            regexPatterns: entity.regexPatterns ? (typeof entity.regexPatterns === 'string' ? JSON.parse(entity.regexPatterns) : entity.regexPatterns) : undefined,
            examples: typeof entity.examples === 'string' ? JSON.parse(entity.examples) : entity.examples,
            contextKeywords: entity.contextKeywords ? (typeof entity.contextKeywords === 'string' ? JSON.parse(entity.contextKeywords) : entity.contextKeywords) : undefined,
            metadata: entity.metadata || undefined,
            description: entity.description,
            color: entity.color,
            isActive: entity.isActive,
            createdAt: entity.createdAt
          };
        } catch (parseError) {
          console.error('PatternService.getAllPatterns: Failed to parse pattern entity:', {
            id: entity.id,
            name: entity.name,
            examples: entity.examples,
            regexPatterns: entity.regexPatterns,
            error: parseError
          });
          // Return pattern with empty arrays for unparseable JSON fields
          return {
            id: entity.id,
            name: entity.name,
            type: entity.type as Pattern['type'],
            category: entity.category,
            regex: entity.regex || undefined,
            regexPatterns: [],
            examples: [],
            description: entity.description,
            color: entity.color,
            isActive: entity.isActive,
            createdAt: entity.createdAt
          };
        }
      });
    } catch (error) {
      console.error('PatternService.getAllPatterns: Repository query failed:', error);
      console.error('Error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });
      // Return empty array if table doesn't exist yet
      return [];
    }
  }

  static async getPatternById(id: string): Promise<Pattern | null> {
    const repository = await getRepository(PatternEntity);
    const entity = await repository.findOne({ where: { id } });

    if (!entity) return null;

    return {
      id: entity.id,
      name: entity.name,
      type: entity.type as Pattern['type'],
      category: entity.category,
      regex: entity.regex || undefined,
      regexPatterns: entity.regexPatterns ? JSON.parse(entity.regexPatterns) : undefined,
      examples: typeof entity.examples === 'string' ? JSON.parse(entity.examples) : entity.examples,
      contextKeywords: entity.contextKeywords ? JSON.parse(entity.contextKeywords) : undefined,
      metadata: entity.metadata || undefined,
      description: entity.description,
      color: entity.color,
      isActive: entity.isActive,
      createdAt: entity.createdAt
    };
  }

  static async updatePattern(id: string, updates: Partial<Pattern>): Promise<Pattern | null> {
    const repository = await getRepository(PatternEntity);
    const entity = await repository.findOne({ where: { id } });
    if (!entity) return null;

    try {
      if (updates.name) entity.name = updates.name;
      if (updates.type) entity.type = updates.type;
      if (updates.category) entity.category = updates.category;
      if (updates.regex !== undefined) entity.regex = updates.regex;
      if (updates.regexPatterns !== undefined) entity.regexPatterns = updates.regexPatterns ? JSON.stringify(updates.regexPatterns) : '[]';
      if (updates.examples) entity.examples = JSON.stringify(updates.examples);
      if (updates.contextKeywords !== undefined) entity.contextKeywords = updates.contextKeywords ? JSON.stringify(updates.contextKeywords) : '[]';
      if (updates.metadata !== undefined) entity.metadata = updates.metadata || '{}';
      if (updates.description) entity.description = updates.description;
      if (updates.color) entity.color = updates.color;
      if (updates.isActive !== undefined) entity.isActive = updates.isActive;

      const repository = await getRepository(PatternEntity);
      const saved = await repository.save(entity);

      return {
        id: saved.id,
        name: saved.name,
        type: saved.type as Pattern['type'],
        category: saved.category,
        regex: saved.regex || undefined,
        regexPatterns: saved.regexPatterns ? JSON.parse(saved.regexPatterns) : undefined,
        examples: typeof saved.examples === 'string' ? JSON.parse(saved.examples) : saved.examples,
        contextKeywords: saved.contextKeywords ? JSON.parse(saved.contextKeywords) : undefined,
        metadata: saved.metadata || undefined,
        description: saved.description,
        color: saved.color,
        isActive: saved.isActive,
        createdAt: saved.createdAt
      };
    } catch {
      // If regexPatterns column doesn't exist, update without it
      if (updates.name) entity.name = updates.name;
      if (updates.type) entity.type = updates.type;
      if (updates.category) entity.category = updates.category;
      if (updates.regex !== undefined) entity.regex = updates.regex;
      if (updates.examples) entity.examples = JSON.stringify(updates.examples);
      if (updates.description) entity.description = updates.description;
      if (updates.color) entity.color = updates.color;
      if (updates.isActive !== undefined) entity.isActive = updates.isActive;

      const repository = await getRepository(PatternEntity);
      const saved = await repository.save(entity);

      return {
        id: saved.id,
        name: saved.name,
        type: saved.type as Pattern['type'],
        category: saved.category,
        regex: saved.regex || undefined,
        regexPatterns: undefined,
        examples: typeof saved.examples === 'string' ? JSON.parse(saved.examples) : saved.examples,
        description: saved.description,
        color: saved.color,
        isActive: saved.isActive,
        createdAt: saved.createdAt
      };
    }
  }

  static async deletePattern(id: string): Promise<boolean> {
    const repository = await getRepository(PatternEntity);
    const result = await repository.delete(id);
    return (result.affected ?? 0) > 0;
  }

  static async testPattern(pattern: Pattern, testText: string): Promise<{ matches: string[]; count: number }> {
    if (!pattern.regex) {
      // For patterns without regex, check for example matches
      const matches: string[] = [];
      pattern.examples.forEach(example => {
        if (testText.toLowerCase().includes(example.toLowerCase())) {
          matches.push(example);
        }
      });
      return { matches, count: matches.length };
    }

    try {
      const regex = new RegExp(pattern.regex, 'gi');
      const matches = testText.match(regex) || [];
      return { matches: [...new Set(matches)], count: matches.length };
    } catch (error) {
      console.error('Invalid regex pattern:', error);
      return { matches: [], count: 0 };
    }
  }
}