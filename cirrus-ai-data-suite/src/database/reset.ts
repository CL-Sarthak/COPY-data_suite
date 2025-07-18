import { DataSource } from 'typeorm';
import { getDatabase } from './connection';

/**
 * Reset the database by dropping and recreating all tables
 * WARNING: This will delete ALL data!
 */
export async function resetDatabase(): Promise<void> {
  let dataSource: DataSource | null = null;
  
  try {
    console.log('🔄 Connecting to database...');
    dataSource = await getDatabase();
    
    if (!dataSource.isInitialized) {
      await dataSource.initialize();
    }
    
    console.log('🗑️  Dropping all tables...');
    await dataSource.dropDatabase();
    
    console.log('🔨 Recreating schema...');
    await dataSource.synchronize();
    
    console.log('✅ Database reset complete!');
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    throw error;
  } finally {
    // Don't destroy the connection if it's managed by the connection pool
    if (dataSource && process.env.FORCE_DB_RESET === 'true') {
      try {
        await dataSource.destroy();
      } catch (error) {
        console.error('Failed to close database connection:', error);
      }
    }
  }
}

// Allow running directly from command line
if (require.main === module) {
  resetDatabase()
    .then(() => {
      console.log('✅ Database reset completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Database reset failed:', error);
      process.exit(1);
    });
}