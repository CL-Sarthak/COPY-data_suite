#!/usr/bin/env tsx
/**
 * Cleanup script to truncate large data source configurations
 * Run with: npx tsx src/scripts/cleanup-large-datasources.ts
 */

import 'reflect-metadata';
import { getDatabase } from '../database/connection';
import { DataSourceEntity } from '../entities/DataSourceEntity';

async function cleanupLargeDataSources() {
  try {
    console.log('Starting data source cleanup...');
    
    const db = await getDatabase();
    const repository = db.getRepository(DataSourceEntity);
    
    const dataSources = await repository.find();
    console.log(`Found ${dataSources.length} data sources to check`);
    
    let cleanedCount = 0;
    
    for (const dataSource of dataSources) {
      const configSize = dataSource.configuration.length;
      const sizeMB = configSize / (1024 * 1024);
      
      console.log(`Data source "${dataSource.name}": ${sizeMB.toFixed(2)}MB config`);
      
      if (configSize > 1024 * 1024) { // > 1MB
        console.log(`  Cleaning up large configuration...`);
        
        try {
          const config = JSON.parse(dataSource.configuration);
          
          if (config.files && Array.isArray(config.files)) {
            config.files = config.files.map((file: { content?: string; [key: string]: unknown }) => ({
              ...file,
              content: file.content && typeof file.content === 'string' && file.content.length > 10000 ? 
                file.content.substring(0, 10000) + '\n\n... [Content truncated for storage efficiency] ...' : 
                file.content,
              contentTruncated: file.content && typeof file.content === 'string' && file.content.length > 10000,
              originalContentLength: file.content ? file.content.length : undefined
            }));
          }
          
          dataSource.configuration = JSON.stringify(config);
          await repository.save(dataSource);
          
          const newSize = dataSource.configuration.length;
          const newSizeMB = newSize / (1024 * 1024);
          console.log(`  Reduced from ${sizeMB.toFixed(2)}MB to ${newSizeMB.toFixed(2)}MB`);
          cleanedCount++;
          
        } catch (error) {
          console.error(`  Failed to clean data source "${dataSource.name}":`, error);
        }
      }
    }
    
    console.log(`\nCleanup completed! Cleaned ${cleanedCount} data sources.`);
    
  } catch (error) {
    console.error('Cleanup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  cleanupLargeDataSources()
    .then(() => {
      console.log('✅ Data source cleanup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Data source cleanup failed:', error);
      process.exit(1);
    });
}

export { cleanupLargeDataSources };