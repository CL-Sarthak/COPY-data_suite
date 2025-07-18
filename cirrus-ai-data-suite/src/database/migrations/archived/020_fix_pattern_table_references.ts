import { QueryRunner } from 'typeorm';

export async function up(queryRunner: QueryRunner): Promise<void> {
  const isPostgres = queryRunner.connection.options.type === 'postgres';
  
  // Check if pattern_entity table exists and needs to be renamed
  let patternEntityExists = false;
  
  if (isPostgres) {
    const result = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'pattern_entity'
      );
    `);
    patternEntityExists = result[0].exists;
  } else {
    const result = await queryRunner.query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='pattern_entity'
    `);
    patternEntityExists = result.length > 0;
  }
  
  if (patternEntityExists) {
    console.log('Found pattern_entity table, migrating to patterns...');
    
    if (isPostgres) {
      // PostgreSQL: Simple rename
      await queryRunner.query(`ALTER TABLE pattern_entity RENAME TO patterns`);
      
      // Add missing columns if they don't exist
      const columnsToAdd = [
        { name: 'regex_patterns', type: 'TEXT', default: "'[]'" },
        { name: 'accuracy_metrics', type: 'TEXT', default: 'NULL' },
        { name: 'last_refined_at', type: 'TIMESTAMP', default: 'NULL' },
        { name: 'feedback_count', type: 'INTEGER', default: '0' },
        { name: 'positive_count', type: 'INTEGER', default: '0' },
        { name: 'negative_count', type: 'INTEGER', default: '0' },
        { name: 'excluded_examples', type: 'TEXT', default: "'[]'" },
        { name: 'confidence_threshold', type: 'FLOAT', default: '0.7' },
        { name: 'auto_refine_threshold', type: 'INTEGER', default: '3' }
      ];
      
      for (const col of columnsToAdd) {
        const columnExists = await queryRunner.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'patterns'
            AND column_name = $1
          );
        `, [col.name]);
        
        if (!columnExists[0].exists) {
          await queryRunner.query(
            `ALTER TABLE patterns ADD COLUMN ${col.name} ${col.type} DEFAULT ${col.default}`
          );
        }
      }
    } else {
      // SQLite: Need to recreate table
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS patterns (
          id VARCHAR(36) PRIMARY KEY,
          name VARCHAR NOT NULL,
          type VARCHAR NOT NULL,
          category VARCHAR NOT NULL,
          regex VARCHAR,
          regex_patterns TEXT DEFAULT '[]',
          examples TEXT NOT NULL,
          description VARCHAR NOT NULL,
          color VARCHAR NOT NULL,
          is_active BOOLEAN NOT NULL DEFAULT 1,
          accuracy_metrics TEXT,
          last_refined_at DATETIME,
          feedback_count INTEGER DEFAULT 0,
          positive_count INTEGER DEFAULT 0,
          negative_count INTEGER DEFAULT 0,
          excluded_examples TEXT DEFAULT '[]',
          confidence_threshold FLOAT DEFAULT 0.7,
          auto_refine_threshold INTEGER DEFAULT 3,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Copy data from pattern_entity
      await queryRunner.query(`
        INSERT INTO patterns (id, name, type, category, regex, examples, description, color, is_active, created_at)
        SELECT id, name, type, category, regex, examples, description, color, isActive, createdAt
        FROM pattern_entity
      `);
      
      // Drop old table
      await queryRunner.query(`DROP TABLE pattern_entity`);
    }
  } else {
    // Check if patterns table exists
    let patternsExists = false;
    
    if (isPostgres) {
      const result = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'patterns'
        );
      `);
      patternsExists = result[0].exists;
    } else {
      const result = await queryRunner.query(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='patterns'
      `);
      patternsExists = result.length > 0;
    }
    
    if (!patternsExists) {
      console.log('Creating patterns table...');
      
      if (isPostgres) {
        await queryRunner.query(`
          CREATE TABLE patterns (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            name VARCHAR NOT NULL,
            type VARCHAR NOT NULL,
            category VARCHAR NOT NULL,
            regex VARCHAR,
            regex_patterns TEXT DEFAULT '[]',
            examples TEXT NOT NULL,
            description VARCHAR NOT NULL,
            color VARCHAR NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT true,
            accuracy_metrics TEXT,
            last_refined_at TIMESTAMP,
            feedback_count INTEGER DEFAULT 0,
            positive_count INTEGER DEFAULT 0,
            negative_count INTEGER DEFAULT 0,
            excluded_examples TEXT DEFAULT '[]',
            confidence_threshold FLOAT DEFAULT 0.7,
            auto_refine_threshold INTEGER DEFAULT 3,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `);
      } else {
        await queryRunner.query(`
          CREATE TABLE patterns (
            id VARCHAR(36) PRIMARY KEY,
            name VARCHAR NOT NULL,
            type VARCHAR NOT NULL,
            category VARCHAR NOT NULL,
            regex VARCHAR,
            regex_patterns TEXT DEFAULT '[]',
            examples TEXT NOT NULL,
            description VARCHAR NOT NULL,
            color VARCHAR NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT 1,
            accuracy_metrics TEXT,
            last_refined_at DATETIME,
            feedback_count INTEGER DEFAULT 0,
            positive_count INTEGER DEFAULT 0,
            negative_count INTEGER DEFAULT 0,
            excluded_examples TEXT DEFAULT '[]',
            confidence_threshold FLOAT DEFAULT 0.7,
            auto_refine_threshold INTEGER DEFAULT 3,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `);
      }
    }
  }
  
  // Fix pattern_feedback table foreign key reference
  // First check if it exists with wrong reference
  let feedbackTableExists = false;
  
  if (isPostgres) {
    const result = await queryRunner.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'pattern_feedback'
      );
    `);
    feedbackTableExists = result[0].exists;
  } else {
    const result = await queryRunner.query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name='pattern_feedback'
    `);
    feedbackTableExists = result.length > 0;
  }
  
  if (feedbackTableExists) {
    // Check if it has the wrong foreign key
    if (isPostgres) {
      const fkExists = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.table_constraints 
          WHERE constraint_type = 'FOREIGN KEY' 
          AND table_name = 'pattern_feedback'
          AND constraint_name LIKE '%pattern_entity%'
        );
      `);
      
      if (fkExists[0].exists) {
        // Need to recreate the table with correct foreign key
        await queryRunner.query(`DROP TABLE pattern_feedback CASCADE`);
        feedbackTableExists = false;
      }
    }
  }
  
  // Create pattern_feedback table if it doesn't exist
  if (!feedbackTableExists) {
    if (isPostgres) {
      await queryRunner.query(`
        CREATE TABLE pattern_feedback (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          pattern_id UUID NOT NULL,
          feedback_type VARCHAR(10) NOT NULL,
          context VARCHAR(20) NOT NULL,
          matched_text TEXT NOT NULL,
          surrounding_context TEXT,
          original_confidence FLOAT,
          user_comment TEXT,
          data_source_id UUID,
          session_id UUID,
          user_id VARCHAR(255) DEFAULT 'system',
          metadata TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE CASCADE
        )
      `);
      
      // Create indices
      await queryRunner.query(`
        CREATE INDEX idx_pattern_feedback_pattern_context 
        ON pattern_feedback(pattern_id, context)
      `);
      
      await queryRunner.query(`
        CREATE INDEX idx_pattern_feedback_created 
        ON pattern_feedback(created_at)
      `);
      
      await queryRunner.query(`
        CREATE INDEX idx_pattern_feedback_pattern 
        ON pattern_feedback(pattern_id)
      `);
    } else {
      await queryRunner.query(`
        CREATE TABLE pattern_feedback (
          id VARCHAR(36) PRIMARY KEY,
          pattern_id VARCHAR(36) NOT NULL,
          feedback_type VARCHAR(10) NOT NULL,
          context VARCHAR(20) NOT NULL,
          matched_text TEXT NOT NULL,
          surrounding_context TEXT,
          original_confidence FLOAT,
          user_comment TEXT,
          data_source_id VARCHAR(36),
          session_id VARCHAR(36),
          user_id VARCHAR(255) DEFAULT 'system',
          metadata TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE CASCADE
        )
      `);
      
      // Create indices
      await queryRunner.query(`
        CREATE INDEX idx_pattern_feedback_pattern_context 
        ON pattern_feedback(pattern_id, context)
      `);
      
      await queryRunner.query(`
        CREATE INDEX idx_pattern_feedback_created 
        ON pattern_feedback(created_at)
      `);
      
      await queryRunner.query(`
        CREATE INDEX idx_pattern_feedback_pattern 
        ON pattern_feedback(pattern_id)
      `);
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function down(_queryRunner: QueryRunner): Promise<void> {
  // This is a fix migration, we don't want to revert it
  console.log('This migration fixes critical issues and should not be reverted');
}