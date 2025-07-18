require('dotenv').config({ path: '.env.local' });
const { DataSource } = require('typeorm');

async function checkDatabase() {
  console.log('🔍 Checking database schema...\n');
  
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    logging: true,
    ssl: process.env.DATABASE_SSL !== 'false' ? { rejectUnauthorized: false } : false,
  });

  try {
    await dataSource.initialize();
    
    // Check existing tables
    const tables = await dataSource.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );
    
    console.log('\n📊 Existing tables:');
    if (tables.length === 0) {
      console.log('  ❌ No tables found in database');
    } else {
      tables.forEach(t => console.log(`  ✅ ${t.table_name}`));
    }
    
    // Check migration tracker
    const migrationTrackerExists = tables.some(t => t.table_name === 'migration_tracker');
    if (migrationTrackerExists) {
      const migrations = await dataSource.query('SELECT * FROM migration_tracker ORDER BY run_at DESC LIMIT 10');
      console.log('\n📋 Recent migrations:');
      migrations.forEach(m => console.log(`  - ${m.migration_name} (${new Date(m.run_at).toISOString()})`));
    }
    
    await dataSource.destroy();
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkDatabase();