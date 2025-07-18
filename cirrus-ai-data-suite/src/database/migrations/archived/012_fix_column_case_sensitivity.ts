import { DataSource } from 'typeorm';

export async function runMigration012(dataSource: DataSource): Promise<void> {
  console.log('Running migration 012: Fixing column case sensitivity for PostgreSQL...');
  
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  
  try {
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    
    if (isPostgres) {
      // Check existing columns and rename if needed
      const columns = await queryRunner.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'data_source_entity'
      `);
      
      const columnNames = columns.map((col: { column_name: string }) => col.column_name);
      
      // Map of expected column names to their PostgreSQL lowercase versions
      const columnMappings = [
        { from: 'recordCount', to: 'recordcount' },
        { from: 'transformedData', to: 'transformeddata' },
        { from: 'transformedAt', to: 'transformedat' },
        { from: 'originalPath', to: 'originalpath' },
        { from: 'storageKeys', to: 'storagekeys' },
        { from: 'storageProvider', to: 'storageprovider' },
        { from: 'transformationStatus', to: 'transformationstatus' },
        { from: 'transformationAppliedAt', to: 'transformationappliedat' },
        { from: 'transformationErrors', to: 'transformationerrors' },
        { from: 'originalFieldNames', to: 'originalfieldnames' },
        { from: 'createdAt', to: 'createdat' },
        { from: 'updatedAt', to: 'updatedat' }
      ];
      
      for (const mapping of columnMappings) {
        // Check if the camelCase version exists
        if (columnNames.includes(mapping.from.toLowerCase())) {
          // Check if lowercase version already exists
          if (!columnNames.includes(mapping.to)) {
            // Rename the column
            await queryRunner.query(`
              ALTER TABLE data_source_entity 
              RENAME COLUMN "${mapping.from.toLowerCase()}" TO ${mapping.to}
            `);
            console.log(`Renamed column ${mapping.from} to ${mapping.to}`);
          }
        } else if (!columnNames.includes(mapping.to)) {
          // Column doesn't exist at all, create it based on the expected type
          let columnDef = '';
          
          switch (mapping.to) {
            case 'recordcount':
              columnDef = 'INTEGER';
              break;
            case 'transformedat':
            case 'transformationappliedat':
            case 'createdat':
            case 'updatedat':
              columnDef = 'TIMESTAMP';
              break;
            case 'transformationstatus':
              columnDef = "TEXT DEFAULT 'not_started'";
              break;
            default:
              columnDef = 'TEXT';
          }
          
          await queryRunner.query(`
            ALTER TABLE data_source_entity 
            ADD COLUMN IF NOT EXISTS ${mapping.to} ${columnDef}
          `);
          console.log(`Created missing column ${mapping.to}`);
        }
      }
      
      // Add defaults for timestamp columns if they don't have them
      await queryRunner.query(`
        ALTER TABLE data_source_entity 
        ALTER COLUMN createdat SET DEFAULT CURRENT_TIMESTAMP
      `).catch(() => {
        // Ignore error if default already exists
      });
      
      await queryRunner.query(`
        ALTER TABLE data_source_entity 
        ALTER COLUMN updatedat SET DEFAULT CURRENT_TIMESTAMP
      `).catch(() => {
        // Ignore error if default already exists
      });
      
      console.log('Migration 012 completed: Fixed column case sensitivity');
    } else {
      console.log('Migration 012 skipped: Not PostgreSQL database');
    }
  } catch (error) {
    console.error('Column case sensitivity migration error:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}