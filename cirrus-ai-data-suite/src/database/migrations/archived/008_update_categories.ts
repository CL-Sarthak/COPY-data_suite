import { DataSource } from 'typeorm';

export async function runMigration008(dataSource: DataSource): Promise<void> {
  console.log('Running migration 008: Updating catalog categories...');
  
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  
  try {
    // Check if the table exists before trying to delete
    const isPostgres = queryRunner.connection.options.type === 'postgres';
    let tableExists = false;
    
    if (isPostgres) {
      const result = await queryRunner.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'catalog_category'
        )
      `);
      tableExists = result[0].exists;
    } else {
      const result = await queryRunner.query(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='catalog_category'
      `);
      tableExists = result.length > 0;
    }
    
    if (tableExists) {
      // Clear existing categories to update with correct data
      await queryRunner.query('DELETE FROM catalog_category');
    } else {
      console.log('Migration 008 skipped: catalog_category table does not exist');
      return;
    }

    // Insert updated standard categories (matching original GlobalCatalogService)
    const standardCategories = [
      {
        id: '1',
        name: 'identity',
        displayName: 'Identity & Personal',
        description: 'Fields related to personal identity and demographics',
        color: '#3b82f6', // blue
        icon: 'UserIcon',
        sortOrder: 1,
        isStandard: true
      },
      {
        id: '2',
        name: 'contact',
        displayName: 'Contact Information',
        description: 'Communication and location details',
        color: '#10b981', // green
        icon: 'PhoneIcon',
        sortOrder: 2,
        isStandard: true
      },
      {
        id: '3',
        name: 'location',
        displayName: 'Geographic Location',
        description: 'Address and geographic information',
        color: '#8b5cf6', // purple
        icon: 'MapPinIcon',
        sortOrder: 3,
        isStandard: true
      },
      {
        id: '4',
        name: 'financial',
        displayName: 'Financial Data',
        description: 'Monetary amounts, accounts, and transactions',
        color: '#10b981', // emerald (using green)
        icon: 'CurrencyDollarIcon',
        sortOrder: 4,
        isStandard: true
      },
      {
        id: '5',
        name: 'temporal',
        displayName: 'Time & Dates',
        description: 'Timestamps, dates, and time-related information',
        color: '#f59e0b', // yellow
        icon: 'ClockIcon',
        sortOrder: 5,
        isStandard: true
      },
      {
        id: '6',
        name: 'business',
        displayName: 'Business Data',
        description: 'Organization and business-related information',
        color: '#6366f1', // indigo
        icon: 'BuildingOfficeIcon',
        sortOrder: 6,
        isStandard: true
      },
      {
        id: '7',
        name: 'system',
        displayName: 'System & Technical',
        description: 'System identifiers, technical metadata',
        color: '#6b7280', // gray
        icon: 'CogIcon',
        sortOrder: 7,
        isStandard: true
      },
      {
        id: '8',
        name: 'custom',
        displayName: 'Custom Fields',
        description: 'User-defined custom fields',
        color: '#f97316', // orange
        icon: 'PuzzlePieceIcon',
        sortOrder: 8,
        isStandard: true
      },
      {
        id: '9',
        name: 'uncategorized',
        displayName: 'Uncategorized',
        description: 'Fields that have not been assigned to a specific category',
        color: '#94a3b8', // slate
        icon: 'QuestionMarkCircleIcon',
        sortOrder: 999,
        isStandard: true
      }
    ];

    const currentTimestamp = new Date().toISOString();
    
    for (const category of standardCategories) {
      // Use database-specific syntax for insert
      const isPostgres = queryRunner.connection.options.type === 'postgres';
      
      if (isPostgres) {
        await queryRunner.query(`
          INSERT INTO catalog_category 
          (id, name, "displayName", description, color, icon, "sortOrder", "isStandard", "isActive", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          category.id,
          category.name,
          category.displayName,
          category.description,
          category.color,
          category.icon,
          category.sortOrder,
          category.isStandard,
          true, // isActive
          currentTimestamp,
          currentTimestamp
        ]);
      } else {
        // SQLite syntax
        await queryRunner.query(`
          INSERT INTO catalog_category 
          (id, name, display_name, description, color, icon, sort_order, is_standard, is_active, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          category.id,
          category.name,
          category.displayName,
          category.description,
          category.color,
          category.icon,
          category.sortOrder,
          category.isStandard ? 1 : 0,
          1, // true for isActive
          currentTimestamp,
          currentTimestamp
        ]);
      }
    }

    console.log('Migration 008 completed: catalog categories updated');
  } catch (error) {
    console.error('Updated catalog categories migration 008 failed:', error);
    // Don't throw if it's a table existence issue, as this might have been resolved elsewhere
    if (error instanceof Error && error.message && !error.message.includes('does not exist')) {
      throw error;
    }
  } finally {
    await queryRunner.release();
  }
}