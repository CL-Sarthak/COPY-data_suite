import { DataSource } from 'typeorm';

export async function runMigration015(dataSource: DataSource): Promise<void> {
  console.log('Running migration 015: Fixing datatype column in synthetic_datasets table...');
  
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  
  try {
    const tableExists = await queryRunner.hasTable('synthetic_datasets');
    
    if (tableExists) {
      const table = await queryRunner.getTable('synthetic_datasets');
      const isPostgres = queryRunner.connection.options.type === 'postgres';
      
      // Check if we have dataType (camelCase) or datatype (lowercase)
      const hasDataType = table?.columns.some(col => col.name === 'dataType');
      const hasDatatype = table?.columns.some(col => col.name === 'datatype');
      
      if (hasDataType && !hasDatatype) {
        // Need to rename dataType to datatype for consistency with Entity mapping
        if (isPostgres) {
          // PostgreSQL: Direct rename
          await queryRunner.query(`
            ALTER TABLE synthetic_datasets 
            RENAME COLUMN "dataType" TO datatype
          `);
          console.log('Renamed dataType column to datatype in PostgreSQL');
        } else {
          // SQLite: Need to recreate the table since SQLite doesn't support RENAME COLUMN in older versions
          // First, create a temporary table with the correct schema
          await queryRunner.query(`
            CREATE TABLE "synthetic_datasets_temp" (
              "id" varchar PRIMARY KEY,
              "name" varchar(255) NOT NULL,
              "description" text,
              "datatype" varchar(100) NOT NULL,
              "schema" text NOT NULL,
              "recordcount" integer NOT NULL DEFAULT 0,
              "configuration" text,
              "status" varchar(50) NOT NULL DEFAULT 'draft',
              "filepath" text,
              "outputformat" varchar(20) NOT NULL DEFAULT 'json',
              "errormessage" text,
              "generatedcontent" text,
              "generatedcontentsize" integer,
              "createdat" datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
              "updatedat" datetime NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
          `);
          
          // Copy data from old table to new table, mapping dataType to datatype
          await queryRunner.query(`
            INSERT INTO synthetic_datasets_temp (
              id, name, description, datatype, schema, recordcount, 
              configuration, status, filepath, outputformat, errormessage,
              generatedcontent, generatedcontentsize, createdat, updatedat
            )
            SELECT 
              id, name, description, dataType as datatype, schema, recordCount as recordcount,
              configuration, status, filePath as filepath, outputFormat as outputformat, errorMessage as errormessage,
              generatedcontent, generatedcontentsize, createdAt as createdat, updatedAt as updatedat
            FROM synthetic_datasets
          `);
          
          // Drop the old table
          await queryRunner.query(`DROP TABLE synthetic_datasets`);
          
          // Rename the temp table to the original name
          await queryRunner.query(`ALTER TABLE synthetic_datasets_temp RENAME TO synthetic_datasets`);
          
          console.log('Recreated synthetic_datasets table with correct column names in SQLite');
        }
      } else if (!hasDataType && !hasDatatype) {
        // Neither column exists, add it with a default value
        await queryRunner.query(`
          ALTER TABLE synthetic_datasets 
          ADD COLUMN datatype varchar(100) NOT NULL DEFAULT 'general'
        `);
        console.log('Added missing datatype column with default value');
      } else if (hasDatatype) {
        console.log('datatype column already exists with correct name');
      }
      
      // Also fix other column names to match Entity mapping
      const columnMappings = [
        { from: 'recordCount', to: 'recordcount' },
        { from: 'filePath', to: 'filepath' },
        { from: 'outputFormat', to: 'outputformat' },
        { from: 'errorMessage', to: 'errormessage' },
        { from: 'createdAt', to: 'createdat' },
        { from: 'updatedAt', to: 'updatedat' }
      ];
      
      if (isPostgres) {
        // For PostgreSQL, we can rename columns directly
        for (const mapping of columnMappings) {
          const hasOldColumn = table?.columns.some(col => col.name === mapping.from);
          const hasNewColumn = table?.columns.some(col => col.name === mapping.to);
          
          if (hasOldColumn && !hasNewColumn) {
            await queryRunner.query(`
              ALTER TABLE synthetic_datasets 
              RENAME COLUMN "${mapping.from}" TO ${mapping.to}
            `);
            console.log(`Renamed column ${mapping.from} to ${mapping.to}`);
          }
        }
      }
      
      console.log('Migration 015 completed: Fixed datatype column and other column names');
    } else {
      console.log('Migration 015 skipped: synthetic_datasets table does not exist');
    }
  } catch (error) {
    console.error('Migration 015 error:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}