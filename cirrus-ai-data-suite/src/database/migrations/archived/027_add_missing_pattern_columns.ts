import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingPatternColumns1736701000027 implements MigrationInterface {
  name = '027_add_missing_pattern_columns';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    
    if (isPostgres) {
      console.log('Adding missing columns to patterns table in PostgreSQL...');
      
      // Check and add each missing column
      const columnsToAdd = [
        { name: 'accuracy_metrics', type: 'TEXT', default: 'NULL' },
        { name: 'last_refined_at', type: 'TIMESTAMP', default: 'NULL' },
        { name: 'feedback_count', type: 'INTEGER', default: '0' },
        { name: 'positive_count', type: 'INTEGER', default: '0' },
        { name: 'negative_count', type: 'INTEGER', default: '0' },
        { name: 'excluded_examples', type: 'TEXT', default: "NULL" },
        { name: 'confidence_threshold', type: 'FLOAT', default: '0.7' },
        { name: 'auto_refine_threshold', type: 'INTEGER', default: '3' }
      ];
      
      for (const col of columnsToAdd) {
        try {
          const columnExists = await queryRunner.query(`
            SELECT EXISTS (
              SELECT FROM information_schema.columns 
              WHERE table_schema = 'public' 
              AND table_name = 'patterns'
              AND column_name = $1
            );
          `, [col.name]);
          
          if (!columnExists[0].exists) {
            console.log(`Adding column ${col.name}...`);
            await queryRunner.query(
              `ALTER TABLE patterns ADD COLUMN ${col.name} ${col.type} DEFAULT ${col.default}`
            );
          } else {
            console.log(`Column ${col.name} already exists`);
          }
        } catch (error) {
          console.error(`Error adding column ${col.name}:`, error);
        }
      }
      
      // Also remove the duplicate regexpatterns column if it exists
      try {
        const dupColumnExists = await queryRunner.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'patterns'
            AND column_name = 'regexpatterns'
          );
        `);
        
        if (dupColumnExists[0].exists) {
          console.log('Removing duplicate regexpatterns column...');
          await queryRunner.query(`ALTER TABLE patterns DROP COLUMN regexpatterns`);
        }
      } catch (error) {
        console.error('Error removing duplicate column:', error);
      }
      
    } else {
      // SQLite
      console.log('Adding missing columns to patterns table in SQLite...');
      
      // For SQLite, we need to check if columns exist first
      const tableInfo = await queryRunner.query(`PRAGMA table_info(patterns)`);
      const existingColumns = tableInfo.map((col: { name: string }) => col.name);
      
      const columnsToAdd = [
        'accuracy_metrics',
        'last_refined_at',
        'feedback_count',
        'positive_count',
        'negative_count',
        'excluded_examples',
        'confidence_threshold',
        'auto_refine_threshold'
      ];
      
      const missingColumns = columnsToAdd.filter(col => !existingColumns.includes(col));
      
      if (missingColumns.length > 0) {
        // SQLite doesn't support adding multiple columns, so we need to recreate the table
        console.log('Recreating patterns table with all columns...');
        
        // Create new table with all columns
        await queryRunner.query(`
          CREATE TABLE patterns_new (
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
            excluded_examples TEXT,
            confidence_threshold FLOAT DEFAULT 0.7,
            auto_refine_threshold INTEGER DEFAULT 3,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // Copy existing data
        await queryRunner.query(`
          INSERT INTO patterns_new (
            id, name, type, category, regex, regex_patterns, 
            examples, description, color, is_active, created_at, updated_at
          )
          SELECT 
            id, name, type, category, regex, 
            COALESCE(regex_patterns, '[]'),
            examples, description, color, is_active, created_at, updated_at
          FROM patterns
        `);
        
        // Drop old table and rename new one
        await queryRunner.query(`DROP TABLE patterns`);
        await queryRunner.query(`ALTER TABLE patterns_new RENAME TO patterns`);
      }
    }
    
    console.log('Migration 027 completed');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Not implementing down migration
  }
}