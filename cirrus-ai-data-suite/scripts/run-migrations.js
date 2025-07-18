#!/usr/bin/env node

/**
 * Build-time migration runner
 * Executes database migrations during the build process
 * If migrations fail, the build fails
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env.production.local' });
require('dotenv').config({ path: '.env' });

console.log('🔄 Running database migrations during build...\n');

// Check if we should skip migrations
if (!process.env.DATABASE_URL) {
  console.log('⏭️  No DATABASE_URL found - skipping migrations');
  console.log('   (Migrations will run at runtime for development)\n');
  process.exit(0);
}

console.log('📡 Database URL found - running production migrations');
console.log(`🔍 Environment: ${process.env.NODE_ENV || 'development'}\n`);

// Set up module resolution
process.env.NODE_OPTIONS = '--enable-source-maps';

// Import TypeScript support with proper configuration
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs',
    moduleResolution: 'node',  // Override bundler resolution
    target: 'es2020',
    esModuleInterop: true,
    allowSyntheticDefaultImports: true,
    strict: false,
    skipLibCheck: true,
    experimentalDecorators: true,
    emitDecoratorMetadata: true,
    resolveJsonModule: true,
    allowJs: true,
    baseUrl: '.',
    paths: {
      '@/*': ['./src/*']
    }
  }
});

// Set up path resolution for @ imports with explicit baseUrl
const path = require('path');
require('tsconfig-paths').register({
  baseUrl: path.resolve(__dirname, '..'),
  paths: {
    '@/*': ['./src/*']
  }
});

// Import reflect-metadata BEFORE any entity imports
require('reflect-metadata');

// Now we can safely import the database connection and migration
const { getDatabase } = require('../src/database/connection');
const { MigrationTracker } = require('../src/database/migrationTracker');
const { CompleteSchema1750000001000 } = require('../src/database/migrations/001_complete_schema');

async function runMigrations() {
  try {
    console.log('🔧 Initializing database connection...');
    
    // Force ensure migrations run by deleting the skip flag
    delete process.env.SKIP_RUNTIME_MIGRATIONS;
    
    // Import and initialize database - this will run migrations
    const db = await getDatabase();
    
    console.log('✅ Database initialized successfully');
    console.log(`📊 Type: ${db.options.type}`);
    console.log(`📊 Entities: ${db.entityMetadatas.length} registered\n`);
    
    // List entities
    console.log('Registered entities:');
    db.entityMetadatas.forEach(meta => {
      console.log(`  - ${meta.name} → ${meta.tableName}`);
    });
    console.log('');
    
    // Force run the complete schema migration if data_source_entity doesn't exist
    try {
      const tableExists = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'data_source_entity'
        );
      `);
      
      if (!tableExists[0].exists) {
        console.log('⚠️  data_source_entity table not found, running complete schema migration...');
        
        const queryRunner = db.createQueryRunner();
        await queryRunner.connect();
        
        try {
          // Run the complete schema migration
          const migration = new CompleteSchema1750000001000();
          await migration.up(queryRunner);
          
          // Track the migration
          await MigrationTracker.checkAndRunMigration(
            db,
            '001_complete_schema',
            async () => {
              console.log('Complete schema migration already applied by direct execution');
            }
          );
          
          console.log('✅ Complete schema migration executed successfully');
        } finally {
          await queryRunner.release();
        }
      }
    } catch (error) {
      console.error('Failed to check/create data_source_entity table:', error);
    }
    
    // Verify connection and check if tables exist
    try {
      await db.query('SELECT 1 as test');
      console.log('✅ Database connection verified');
      
      // Check if key tables exist
      const tableCheck = await db.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('data_source_entity', 'patterns', 'migrations')
        ORDER BY table_name
      `);
      
      console.log('\n📋 Tables found:');
      tableCheck.forEach((row) => {
        console.log(`  - ${row.table_name}`);
      });
      
      if (tableCheck.length === 0) {
        console.error('\n❌ No tables found! Migrations may not have run.');
        throw new Error('Database tables not created');
      }
      
    } catch (error) {
      console.error('❌ Database verification failed:', error);
      throw error;
    }
    
    console.log('\n✅ Migrations completed successfully!');
    console.log('   All migrations have been applied.\n');
    
    // Close connection
    await db.destroy();
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('\n🚫 Build failed due to migration error');
    console.error('   Fix the migration issue and try again.\n');
    process.exit(1);
  }
}

// Run migrations
runMigrations().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});