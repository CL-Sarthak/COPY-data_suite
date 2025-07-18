import { DataSource } from 'typeorm';

export async function runMigration007(dataSource: DataSource): Promise<void> {
  console.log('Running migration 007: Creating catalog_category table...');
  
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  
  try {
    // Check if table already exists
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
      console.log('Migration 007 skipped: catalog_category table already exists');
      return;
    }
    
    // Create catalog_category table with database-specific syntax
    
    if (isPostgres) {
      // PostgreSQL syntax
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS catalog_category (
          id TEXT PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          "displayName" TEXT NOT NULL,
          description TEXT,
          color TEXT DEFAULT '#6b7280',
          icon TEXT,
          "sortOrder" INTEGER DEFAULT 999,
          "isStandard" BOOLEAN DEFAULT false,
          "isActive" BOOLEAN DEFAULT true,
          "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } else {
      // SQLite syntax
      await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS catalog_category (
          id TEXT PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          displayName TEXT NOT NULL,
          description TEXT,
          color TEXT DEFAULT '#6b7280',
          icon TEXT,
          sortOrder INTEGER DEFAULT 999,
          isStandard BOOLEAN DEFAULT false,
          isActive BOOLEAN DEFAULT true,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    // Insert standard categories (matching original GlobalCatalogService)
    const standardCategories = [
      {
        id: '1',
        name: 'identity',
        displayName: 'Identity & Personal',
        description: 'Fields related to personal identity and demographics',
        color: '#3b82f6', // blue (bg-blue-100 text-blue-800)
        icon: 'UserIcon',
        sortOrder: 1,
        isStandard: true
      },
      {
        id: '2',
        name: 'contact',
        displayName: 'Contact Information',
        description: 'Communication and location details',
        color: '#10b981', // green (bg-green-100 text-green-800)
        icon: 'PhoneIcon',
        sortOrder: 2,
        isStandard: true
      },
      {
        id: '3',
        name: 'location',
        displayName: 'Geographic Location',
        description: 'Address and geographic information',
        color: '#8b5cf6', // purple (bg-purple-100 text-purple-800)
        icon: 'MapPinIcon',
        sortOrder: 3,
        isStandard: true
      },
      {
        id: '4',
        name: 'financial',
        displayName: 'Financial Data',
        description: 'Monetary amounts, accounts, and transactions',
        color: '#10b981', // emerald (bg-emerald-100 text-emerald-800)
        icon: 'CurrencyDollarIcon',
        sortOrder: 4,
        isStandard: true
      },
      {
        id: '5',
        name: 'temporal',
        displayName: 'Time & Dates',
        description: 'Timestamps, dates, and time-related information',
        color: '#f59e0b', // yellow (bg-yellow-100 text-yellow-800)
        icon: 'ClockIcon',
        sortOrder: 5,
        isStandard: true
      },
      {
        id: '6',
        name: 'business',
        displayName: 'Business Data',
        description: 'Organization and business-related information',
        color: '#6366f1', // indigo (bg-indigo-100 text-indigo-800)
        icon: 'BuildingOfficeIcon',
        sortOrder: 6,
        isStandard: true
      },
      {
        id: '7',
        name: 'system',
        displayName: 'System & Technical',
        description: 'System identifiers, technical metadata',
        color: '#6b7280', // gray (bg-gray-100 text-gray-800)
        icon: 'CogIcon',
        sortOrder: 7,
        isStandard: true
      },
      {
        id: '8',
        name: 'custom',
        displayName: 'Custom Fields',
        description: 'User-defined custom fields',
        color: '#f97316', // orange (bg-orange-100 text-orange-800)
        icon: 'PuzzlePieceIcon',
        sortOrder: 8,
        isStandard: true
      },
      {
        id: '9',
        name: 'uncategorized',
        displayName: 'Uncategorized',
        description: 'Fields that have not been assigned to a specific category',
        color: '#94a3b8', // slate (bg-slate-100 text-slate-800)
        icon: 'QuestionMarkCircleIcon',
        sortOrder: 999,
        isStandard: true
      }
    ];

    const currentTimestamp = new Date().toISOString();
    
    for (const category of standardCategories) {
      // Use database-specific syntax for upsert
      const isPostgres = queryRunner.connection.options.type === 'postgres';
      
      if (isPostgres) {
        await queryRunner.query(`
          INSERT INTO catalog_category 
          (id, name, "displayName", description, color, icon, "sortOrder", "isStandard", "isActive", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (id) DO NOTHING
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
          INSERT OR IGNORE INTO catalog_category 
          (id, name, displayName, description, color, icon, sortOrder, isStandard, isActive, createdAt, updatedAt)
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

    console.log('Migration 007 completed: catalog_category table created with standard categories');
  } catch (error) {
    console.error('Catalog categories migration 007 failed:', error);
    // Re-throw only if it's not a recoverable error
    if (error instanceof Error && error.message && !error.message.includes('already exists') && !error.message.includes('does not exist')) {
      throw error;
    }
  } finally {
    await queryRunner.release();
  }
}