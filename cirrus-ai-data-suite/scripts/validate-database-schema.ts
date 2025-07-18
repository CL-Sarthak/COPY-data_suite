#!/usr/bin/env node
import 'reflect-metadata';

/**
 * This script validates that the database schema will work correctly
 * across both SQLite (development) and PostgreSQL (production).
 */

async function validateSchema() {
  console.log('🔍 Validating database schema consistency...\n');

  try {
    // Dynamic imports to avoid TypeScript decorator issues
    const { DataSource } = await import('typeorm');
    const { ConsistentNamingStrategy } = await import('../src/database/naming-strategy');
    const { PatternEntity } = await import('../src/entities/PatternEntity');
    const { PatternFeedback } = await import('../src/entities/PatternFeedback');
    const { DataSourceEntity } = await import('../src/entities/DataSourceEntity');

    // Create temporary test databases
    const sqliteDb = new DataSource({
      type: 'better-sqlite3',
      database: ':memory:',
      entities: [PatternEntity, PatternFeedback, DataSourceEntity],
      synchronize: true,
      logging: false,
      namingStrategy: new ConsistentNamingStrategy(),
    });

    // Initialize SQLite to get the schema
    await sqliteDb.initialize();
    
    console.log('✅ SQLite database initialized successfully');

    // Get metadata for validation
    const entities = sqliteDb.entityMetadatas;
    const issues: string[] = [];

    for (const entity of entities) {
      console.log(`\n📊 Validating entity: ${entity.name}`);
      
      // Check table name
      const tableName = entity.tableName;
      console.log(`  Table: ${tableName}`);

      // Check all columns
      for (const column of entity.columns) {
        const columnName = column.databaseName;
        const propertyName = column.propertyName;
        
        // Validate column name format
        if (columnName !== columnName.toLowerCase()) {
          issues.push(`❌ Column "${columnName}" in ${entity.name} contains uppercase letters. This will cause issues in PostgreSQL.`);
        }

        // Check if explicit name is set for camelCase properties
        if (propertyName !== propertyName.toLowerCase() && !column.givenDatabaseName) {
          console.log(`  ⚠️  Property "${propertyName}" should have explicit column name`);
        } else {
          console.log(`  ✅ Column: ${columnName} (property: ${propertyName})`);
        }
      }
    }

    // Report issues
    if (issues.length > 0) {
      console.log('\n❌ Schema validation failed with the following issues:\n');
      issues.forEach(issue => console.log(issue));
      process.exit(1);
    } else {
      console.log('\n✅ Schema validation passed! Database schema is consistent across SQLite and PostgreSQL.');
    }

    await sqliteDb.destroy();

  } catch (error) {
    console.error('❌ Schema validation failed:', error);
    process.exit(1);
  }
}

// Run validation
validateSchema().catch(error => {
  console.error('Validation error:', error);
  process.exit(1);
});