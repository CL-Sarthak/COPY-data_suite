#!/usr/bin/env node

// Load environment variables
require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const { Client } = require('pg');

async function checkDatabaseStructure() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });

  try {
    await client.connect();
    console.log('Connected to database\n');

    // Check catalog_field table structure
    const catalogFieldQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'catalog_field'
      ORDER BY ordinal_position;
    `;

    const catalogFieldResult = await client.query(catalogFieldQuery);
    console.log('catalog_field table columns:');
    console.table(catalogFieldResult.rows);

    // Check migration history
    const migrationQuery = `
      SELECT name, timestamp 
      FROM migrations 
      ORDER BY timestamp DESC
      LIMIT 20;
    `;

    try {
      const migrationResult = await client.query(migrationQuery);
      console.log('\nRecent migrations:');
      console.table(migrationResult.rows);
    } catch (error) {
      console.log('\nMigrations table not found or error:', error.message);
    }

    // List all migrations files
    const fs = require('fs');
    const path = require('path');
    const migrationsDir = path.join(__dirname, '../src/database/migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.ts'))
      .sort();
    
    console.log('\nMigration files found:', migrationFiles.length);
    console.log(migrationFiles.join('\n'));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkDatabaseStructure().catch(console.error);