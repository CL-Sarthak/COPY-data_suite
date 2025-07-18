import { QueryRunner } from 'typeorm';

export async function up(queryRunner: QueryRunner): Promise<void> {
  const isPostgres = queryRunner.connection.options.type === 'postgres';
  
  // Create pattern_feedback table
  if (isPostgres) {
    // PostgreSQL version with proper types
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pattern_feedback (
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
  } else {
    // SQLite version
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS pattern_feedback (
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE CASCADE
      )
    `);
  }

  // Create indices for better query performance
  if (isPostgres) {
    // PostgreSQL: Check if columns exist before creating indices
    try {
      const hasContextColumn = await queryRunner.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'pattern_feedback' 
        AND column_name = 'context'
      `);
      
      if (hasContextColumn && hasContextColumn.length > 0) {
        await queryRunner.query(`
          CREATE INDEX IF NOT EXISTS idx_pattern_feedback_pattern_context 
          ON pattern_feedback(pattern_id, context)
        `);
      }
    } catch (error) {
      console.log('Skipping context index:', error);
    }

    try {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_pattern_feedback_created 
        ON pattern_feedback(created_at)
      `);
    } catch (error) {
      console.log('Skipping created_at index:', error);
    }

    try {
      await queryRunner.query(`
        CREATE INDEX IF NOT EXISTS idx_pattern_feedback_pattern 
        ON pattern_feedback(pattern_id)
      `);
    } catch (error) {
      console.log('Skipping pattern_id index:', error);
    }
  } else {
    // SQLite: Try to create indices, ignore if they exist
    try {
      await queryRunner.query(`
        CREATE INDEX idx_pattern_feedback_pattern_context 
        ON pattern_feedback(pattern_id, context)
      `);
    } catch {
      console.log('Index idx_pattern_feedback_pattern_context already exists');
    }

    try {
      await queryRunner.query(`
        CREATE INDEX idx_pattern_feedback_created 
        ON pattern_feedback(created_at)
      `);
    } catch {
      console.log('Index idx_pattern_feedback_created already exists');
    }

    try {
      await queryRunner.query(`
        CREATE INDEX idx_pattern_feedback_pattern 
        ON pattern_feedback(pattern_id)
      `);
    } catch {
      console.log('Index idx_pattern_feedback_pattern already exists');
    }
  }

  // Add accuracy metrics columns to patterns table
  
  if (isPostgres) {
    // PostgreSQL: Use IF NOT EXISTS
    await queryRunner.query(`
      ALTER TABLE patterns 
      ADD COLUMN IF NOT EXISTS accuracy_metrics TEXT
    `);

    await queryRunner.query(`
      ALTER TABLE patterns 
      ADD COLUMN IF NOT EXISTS last_refined_at TIMESTAMP
    `);

    await queryRunner.query(`
      ALTER TABLE patterns 
      ADD COLUMN IF NOT EXISTS feedback_count INTEGER DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE patterns 
      ADD COLUMN IF NOT EXISTS positive_count INTEGER DEFAULT 0
    `);

    await queryRunner.query(`
      ALTER TABLE patterns 
      ADD COLUMN IF NOT EXISTS negative_count INTEGER DEFAULT 0
    `);
  } else {
    // SQLite: Try to add columns, ignore if they exist
    try {
      await queryRunner.query(`
        ALTER TABLE patterns 
        ADD COLUMN accuracy_metrics TEXT
      `);
    } catch {
      console.log('Column accuracy_metrics already exists');
    }

    try {
      await queryRunner.query(`
        ALTER TABLE patterns 
        ADD COLUMN last_refined_at TIMESTAMP
      `);
    } catch {
      console.log('Column last_refined_at already exists');
    }

    try {
      await queryRunner.query(`
        ALTER TABLE patterns 
        ADD COLUMN feedback_count INTEGER DEFAULT 0
      `);
    } catch {
      console.log('Column feedback_count already exists');
    }

    try {
      await queryRunner.query(`
        ALTER TABLE patterns 
        ADD COLUMN positive_count INTEGER DEFAULT 0
      `);
    } catch {
      console.log('Column positive_count already exists');
    }

    try {
      await queryRunner.query(`
        ALTER TABLE patterns 
        ADD COLUMN negative_count INTEGER DEFAULT 0
      `);
    } catch {
      console.log('Column negative_count already exists');
    }
  }
}

export async function down(queryRunner: QueryRunner): Promise<void> {
  // Drop indices
  await queryRunner.query(`DROP INDEX IF EXISTS idx_pattern_feedback_pattern_context`);
  await queryRunner.query(`DROP INDEX IF EXISTS idx_pattern_feedback_created`);
  await queryRunner.query(`DROP INDEX IF EXISTS idx_pattern_feedback_pattern`);
  
  // Drop pattern_feedback table
  await queryRunner.query(`DROP TABLE IF EXISTS pattern_feedback`);

  // Remove columns from patterns table
  try {
    await queryRunner.query(`ALTER TABLE patterns DROP COLUMN accuracy_metrics`);
    await queryRunner.query(`ALTER TABLE patterns DROP COLUMN last_refined_at`);
    await queryRunner.query(`ALTER TABLE patterns DROP COLUMN feedback_count`);
    await queryRunner.query(`ALTER TABLE patterns DROP COLUMN positive_count`);
    await queryRunner.query(`ALTER TABLE patterns DROP COLUMN negative_count`);
  } catch {
    // SQLite doesn't support DROP COLUMN, would need to recreate table
    console.log('Note: Column removal not supported in SQLite');
  }
}