import { NextResponse } from 'next/server';
import { getDatabase } from '@/database/connection';

export async function GET() {
  try {
    const db = await getDatabase();
    
    // Check which quality-related tables exist
    const tableCheckQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN (
        'data_quality_templates',
        'quality_rules',
        'rule_executions',
        'remediation_jobs',
        'remediation_actions',
        'fix_templates',
        'remediation_history'
      )
      ORDER BY table_name;
    `;
    
    const existingTables = await db.query(tableCheckQuery);
    
    // Check migration status
    const migrationQuery = `
      SELECT name, executed_at 
      FROM typeorm_migrations 
      WHERE name LIKE '%quality%' 
      OR name LIKE '%remediation%' 
      OR name LIKE '%fix_templates%' 
      OR name LIKE '%rule%'
      ORDER BY executed_at DESC;
    `;
    
    let migrations = [];
    try {
      migrations = await db.query(migrationQuery);
    } catch (e) {
      // Migration table might not exist
      console.log('Migration table query failed:', e);
    }
    
    // Get entity metadata
    const entityMetadata = db.entityMetadatas
      .filter(meta => meta.tableName.includes('quality') || 
                     meta.tableName.includes('remediation') || 
                     meta.tableName.includes('rule') ||
                     meta.tableName.includes('fix'))
      .map(meta => ({
        entityName: meta.name,
        tableName: meta.tableName,
        columns: meta.columns.map(col => col.propertyName)
      }));
    
    return NextResponse.json({
      success: true,
      existingTables: existingTables.map((t: { table_name: string }) => t.table_name),
      migrations: migrations,
      entityMetadata: entityMetadata,
      totalEntityCount: db.entityMetadatas.length
    });
    
  } catch (error) {
    console.error('Debug quality tables error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}