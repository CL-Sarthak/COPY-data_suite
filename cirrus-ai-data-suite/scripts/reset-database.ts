import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { logger } from '../src/utils/logger';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function resetDatabase() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  // Safety check
  const isProduction = process.env.NODE_ENV === 'production';
  const forceReset = process.env.FORCE_RESET === 'true';
  
  if (isProduction && !forceReset) {
    console.error('⚠️  WARNING: This will DROP ALL TABLES in the database!');
    console.error('To proceed in production, set FORCE_RESET=true');
    process.exit(1);
  }

  console.log('🔄 Resetting database...');
  console.log('📡 Database URL:', databaseUrl.replace(/:[^:]*@/, ':****@'));

  const dataSource = new DataSource({
    type: 'postgres',
    url: databaseUrl,
    ssl: process.env.DATABASE_SSL !== 'false' ? { rejectUnauthorized: false } : false,
    logging: true,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Connected to database');

    // Drop all tables in the correct order (respecting foreign keys)
    const tablesToDrop = [
      'pattern_feedback',
      'upload_sessions', 
      'processed_file',
      'annotation_session',
      'field_mapping',
      'catalog_field',
      'catalog_category',
      'pipeline',
      'synthetic_data_jobs',
      'synthetic_datasets',
      'patterns',
      'data_source_entity',
      'migration_tracker'
    ];

    console.log('🗑️  Dropping existing tables...');
    for (const table of tablesToDrop) {
      try {
        await dataSource.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
        console.log(`  ✓ Dropped table: ${table}`);
      } catch (error) {
        console.log(`  ⚠️  Could not drop table ${table}:`, error instanceof Error ? error.message : 'Unknown error');
      }
    }

    console.log('✅ Database reset complete!');
    console.log('');
    console.log('Next steps:');
    console.log('1. Run migrations: npm run migrate');
    console.log('2. Or let the app run migrations on startup');

  } catch (error) {
    console.error('❌ Error resetting database:', error);
    process.exit(1);
  } finally {
    await dataSource.destroy();
  }
}

// Run the reset
resetDatabase().catch(console.error);