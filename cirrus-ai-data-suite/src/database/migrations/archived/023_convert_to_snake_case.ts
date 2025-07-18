import { MigrationInterface, QueryRunner, TableIndex } from 'typeorm';

export class ConvertToSnakeCase1736628000023 implements MigrationInterface {
  name = 'ConvertToSnakeCase1736628000023';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const dbType = queryRunner.connection.options.type;
    
    // Column renames for patterns table
    const patternRenames = [
      { old: 'isActive', new: 'is_active' },
      { old: 'regexPatterns', new: 'regex_patterns' },
      { old: 'accuracyMetrics', new: 'accuracy_metrics' },
      { old: 'lastRefinedAt', new: 'last_refined_at' },
      { old: 'feedbackCount', new: 'feedback_count' },
      { old: 'positiveCount', new: 'positive_count' },
      { old: 'negativeCount', new: 'negative_count' },
      { old: 'excludedExamples', new: 'excluded_examples' },
      { old: 'confidenceThreshold', new: 'confidence_threshold' },
      { old: 'autoRefineThreshold', new: 'auto_refine_threshold' },
      { old: 'createdAt', new: 'created_at' },
      { old: 'updatedAt', new: 'updated_at' }
    ];

    // Column renames for pattern_feedback table
    const feedbackRenames = [
      { old: 'patternId', new: 'pattern_id' },
      { old: 'feedbackType', new: 'feedback_type' },
      { old: 'matchedText', new: 'matched_text' },
      { old: 'surroundingContext', new: 'surrounding_context' },
      { old: 'originalConfidence', new: 'original_confidence' },
      { old: 'userComment', new: 'user_comment' },
      { old: 'dataSourceId', new: 'data_source_id' },
      { old: 'sessionId', new: 'session_id' },
      { old: 'userId', new: 'user_id' },
      { old: 'createdAt', new: 'created_at' },
      { old: 'updatedAt', new: 'updated_at' }
    ];

    // Check if patterns table exists
    const hasPatterns = await queryRunner.hasTable('patterns');
    if (hasPatterns) {
      console.log('Converting patterns table columns to snake_case...');
      
      for (const rename of patternRenames) {
        try {
          // Check if old column exists
          const hasOldColumn = await queryRunner.hasColumn('patterns', rename.old);
          const hasNewColumn = await queryRunner.hasColumn('patterns', rename.new);
          
          if (hasOldColumn && !hasNewColumn) {
            if (dbType === 'postgres') {
              await queryRunner.query(`ALTER TABLE patterns RENAME COLUMN "${rename.old}" TO "${rename.new}"`);
            } else {
              // SQLite doesn't support RENAME COLUMN in older versions
              // For SQLite, we'll just log a warning since it's case-insensitive anyway
              console.log(`SQLite: Column ${rename.old} -> ${rename.new} (no rename needed, case-insensitive)`);
            }
          } else if (hasNewColumn) {
            console.log(`Column ${rename.new} already exists in patterns table`);
          }
        } catch (error) {
          console.log(`Could not rename ${rename.old} to ${rename.new} in patterns:`, error);
        }
      }
    }

    // Check if pattern_feedback table exists
    const hasFeedback = await queryRunner.hasTable('pattern_feedback');
    if (hasFeedback) {
      console.log('Converting pattern_feedback table columns to snake_case...');
      
      // First, drop the foreign key constraint if it exists
      if (dbType === 'postgres') {
        try {
          // Find foreign key constraint name
          const fkConstraints = await queryRunner.query(`
            SELECT constraint_name 
            FROM information_schema.table_constraints 
            WHERE table_name = 'pattern_feedback' 
            AND constraint_type = 'FOREIGN KEY'
            AND constraint_name LIKE '%pattern%'
          `);
          
          for (const fk of fkConstraints) {
            await queryRunner.query(`ALTER TABLE pattern_feedback DROP CONSTRAINT "${fk.constraint_name}"`);
          }
        } catch (error) {
          console.log('Could not drop foreign key constraints:', error);
        }
      }
      
      for (const rename of feedbackRenames) {
        try {
          // Check if old column exists
          const hasOldColumn = await queryRunner.hasColumn('pattern_feedback', rename.old);
          const hasNewColumn = await queryRunner.hasColumn('pattern_feedback', rename.new);
          
          if (hasOldColumn && !hasNewColumn) {
            if (dbType === 'postgres') {
              await queryRunner.query(`ALTER TABLE pattern_feedback RENAME COLUMN "${rename.old}" TO "${rename.new}"`);
            } else {
              console.log(`SQLite: Column ${rename.old} -> ${rename.new} (no rename needed, case-insensitive)`);
            }
          } else if (hasNewColumn) {
            console.log(`Column ${rename.new} already exists in pattern_feedback table`);
          }
        } catch (error) {
          console.log(`Could not rename ${rename.old} to ${rename.new} in pattern_feedback:`, error);
        }
      }
      
      // Recreate foreign key constraint with new column name
      if (dbType === 'postgres') {
        try {
          await queryRunner.query(`
            ALTER TABLE pattern_feedback 
            ADD CONSTRAINT fk_pattern_feedback_pattern_id 
            FOREIGN KEY (pattern_id) REFERENCES patterns(id) ON DELETE CASCADE
          `);
        } catch (error) {
          console.log('Could not recreate foreign key constraint:', error);
        }
      }
      
      // Update indices
      try {
        // Drop old indices
        await queryRunner.dropIndex('pattern_feedback', 'IDX_pattern_feedback_patternId_context');
        await queryRunner.dropIndex('pattern_feedback', 'IDX_pattern_feedback_createdAt');
      } catch (error) {
        console.log('Could not drop old indices:', error);
      }
      
      try {
        // Create new indices with snake_case column names
        await queryRunner.createIndex('pattern_feedback', new TableIndex({
          name: 'IDX_pattern_feedback_pattern_id_context',
          columnNames: ['pattern_id', 'context']
        }));
        
        await queryRunner.createIndex('pattern_feedback', new TableIndex({
          name: 'IDX_pattern_feedback_created_at',
          columnNames: ['created_at']
        }));
      } catch (error) {
        console.log('Could not create new indices:', error);
      }
    }
  }

  public async down(): Promise<void> {
    // We don't reverse snake_case conversion
    console.log('Column naming convention change cannot be reversed');
  }
}