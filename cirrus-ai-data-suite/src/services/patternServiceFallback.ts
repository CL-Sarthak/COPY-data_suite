import { DataSource } from 'typeorm';
import { Pattern } from './patternService';

/**
 * Fallback queries for patterns table with column name compatibility
 */
export async function getAllPatternsWithFallback(db: DataSource, tableName: string): Promise<Pattern[]> {
  // First, try to detect which column naming convention is being used
  let useSnakeCase = false;
  
  try {
    // Try snake_case query
    await db.query(`SELECT is_active FROM ${tableName} LIMIT 0`);
    useSnakeCase = true;
  } catch {
    // If snake_case fails, we'll use camelCase
    useSnakeCase = false;
  }
  
  // Build the appropriate query based on column naming
  const query = useSnakeCase ? `
    SELECT 
      id, 
      name, 
      type, 
      category, 
      regex, 
      regex_patterns as "regexPatterns",
      examples, 
      description, 
      color, 
      is_active as "isActive", 
      created_at as "createdAt"
    FROM ${tableName}
    ORDER BY created_at DESC
  ` : `
    SELECT 
      id, 
      name, 
      type, 
      category, 
      regex,
      regexPatterns,
      examples, 
      description, 
      color, 
      isActive, 
      createdAt
    FROM ${tableName}
    ORDER BY createdAt DESC
  `;
  
  const rawPatterns = await db.query(query);
  
  return rawPatterns.map((entity: {
    id: string;
    name: string;
    type: string;
    category: string;
    regex: string | null;
    regexPatterns?: string | null;
    examples: string;
    description: string;
    color: string;
    isActive: boolean;
    createdAt: Date;
  }) => {
    try {
      return {
        id: entity.id,
        name: entity.name,
        type: entity.type as Pattern['type'],
        category: entity.category,
        regex: entity.regex || undefined,
        regexPatterns: entity.regexPatterns ? 
          (typeof entity.regexPatterns === 'string' ? JSON.parse(entity.regexPatterns) : entity.regexPatterns) : 
          undefined,
        examples: typeof entity.examples === 'string' ? JSON.parse(entity.examples) : entity.examples,
        description: entity.description,
        color: entity.color,
        isActive: entity.isActive,
        createdAt: entity.createdAt
      };
    } catch (parseError) {
      console.error('Failed to parse pattern data:', {
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
}

export async function createPatternWithFallback(
  db: DataSource, 
  tableName: string, 
  pattern: Omit<Pattern, 'id' | 'createdAt'>
): Promise<{ id: string }> {
  // Detect column naming
  let useSnakeCase = false;
  
  try {
    await db.query(`SELECT is_active FROM ${tableName} LIMIT 0`);
    useSnakeCase = true;
  } catch {
    useSnakeCase = false;
  }
  
  // Prepare values
  const id = generateUUID();
  const regexPatternsJson = pattern.regexPatterns ? JSON.stringify(pattern.regexPatterns) : '[]';
  const examplesJson = JSON.stringify(pattern.examples);
  
  // Build appropriate insert query
  if (useSnakeCase) {
    await db.query(`
      INSERT INTO ${tableName} (
        id, name, type, category, regex, regex_patterns, 
        examples, description, color, is_active, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [
      id, pattern.name, pattern.type, pattern.category, 
      pattern.regex || '', regexPatternsJson, examplesJson, 
      pattern.description, pattern.color, pattern.isActive
    ]);
  } else {
    await db.query(`
      INSERT INTO ${tableName} (
        id, name, type, category, regex, regexPatterns, 
        examples, description, color, isActive, createdAt, updatedAt
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `, [
      id, pattern.name, pattern.type, pattern.category, 
      pattern.regex || '', regexPatternsJson, examplesJson, 
      pattern.description, pattern.color, pattern.isActive
    ]);
  }
  
  return { id };
}

// Simple UUID v4 generator
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}