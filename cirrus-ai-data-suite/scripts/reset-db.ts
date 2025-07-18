#!/usr/bin/env ts-node

/**
 * Database Reset Script
 * 
 * Resets the PostgreSQL database to an empty state by:
 * 1. Providing instructions to drop all tables
 * 2. Running migrations to recreate schema
 * 
 * Usage: npm run db:reset
 */

import { config } from 'dotenv';
import { execSync } from 'child_process';
import * as path from 'path';

// Load environment variables from .env.local first, then .env
config({ path: path.resolve(process.cwd(), '.env.local') });
config({ path: path.resolve(process.cwd(), '.env') });

const databaseUrl = process.env.DATABASE_URL;

async function resetDatabase() {
  console.log('🔄 Starting database reset...\n');

  try {
    if (!databaseUrl) {
      console.log('❌ DATABASE_URL environment variable is not set.');
      console.log('📝 Please configure your PostgreSQL database connection.');
      console.log('   Example: DATABASE_URL="postgresql://user:password@localhost:5432/dbname"\n');
      process.exit(1);
    }
    
    // PostgreSQL reset
    console.log('📊 Database: PostgreSQL');
    console.log('⚠️  This will DELETE ALL DATA in your database!\n');
    
    // Ask for confirmation
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    readline.question('Are you sure you want to reset the database? Type "yes" to confirm: ', async (answer: string) => {
      if (answer.toLowerCase() !== 'yes') {
        console.log('\n❌ Database reset cancelled.');
        readline.close();
        return;
      }

      readline.close();
      
      console.log('\n🗑️  Dropping all tables...');
      
      try {
        // Parse connection URL to get database name
        const url = new URL(databaseUrl);
        const dbName = url.pathname.substring(1);
        
        // Use TypeORM to get a connection and drop/recreate schema
        const { DataSource } = await import('typeorm');
        
        const dataSource = new DataSource({
          type: 'postgres',
          url: databaseUrl,
        });
        
        await dataSource.initialize();
        
        // Drop and recreate public schema
        await dataSource.query('DROP SCHEMA IF EXISTS public CASCADE');
        await dataSource.query('CREATE SCHEMA public');
        await dataSource.query('GRANT ALL ON SCHEMA public TO postgres');
        await dataSource.query('GRANT ALL ON SCHEMA public TO public');
        
        console.log('✅ Schema dropped and recreated');
        
        await dataSource.destroy();
        
        // Run migrations
        console.log('\n🔄 Running migrations...');
        execSync('npm run migrate', { stdio: 'inherit' });
        
        console.log('\n✅ Database reset completed successfully!');
        console.log('📝 Your database is now empty with a fresh schema.\n');
        
      } catch (error) {
        console.error('\n❌ Database reset failed:', error);
        console.log('\nIf the error persists, you can manually reset by running:');
        console.log('1. psql -U postgres -d postgres');
        console.log(`2. DROP DATABASE IF EXISTS ${path.basename(databaseUrl)};`);
        console.log(`3. CREATE DATABASE ${path.basename(databaseUrl)};`);
        console.log('4. npm run migrate\n');
        process.exit(1);
      }
    });
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    process.exit(1);
  }
}

// Run the reset
resetDatabase().catch(console.error);