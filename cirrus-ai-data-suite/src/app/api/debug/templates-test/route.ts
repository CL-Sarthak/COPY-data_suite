import { NextResponse } from 'next/server';
import { getDatabase } from '@/database/connection';
import { DataQualityTemplateEntity } from '@/entities/DataQualityTemplateEntity';

export async function GET() {
  try {
    console.log('Debug: Testing data quality templates...');
    
    const db = await getDatabase();
    console.log('Debug: Database connection established');
    
    // Test 1: Check if entity is registered
    console.log('Debug: Checking entity metadata...');
    const metadata = db.getMetadata(DataQualityTemplateEntity);
    console.log('Debug: Entity metadata found:', {
      tableName: metadata.tableName,
      columns: metadata.columns.map(c => ({ propertyName: c.propertyName, databaseName: c.databaseName }))
    });
    
    // Test 2: Check if table exists
    console.log('Debug: Checking if table exists...');
    const tableExists = await db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'data_quality_templates'
      );
    `);
    console.log('Debug: Table exists:', tableExists[0].exists);
    
    // Test 3: Try to count records
    console.log('Debug: Trying to count records...');
    const repository = db.getRepository(DataQualityTemplateEntity);
    const count = await repository.count();
    console.log('Debug: Record count:', count);
    
    // Test 4: Try a simple query
    console.log('Debug: Trying simple query...');
    const templates = await repository.find({ take: 5 });
    console.log('Debug: Found templates:', templates.length);
    
    return NextResponse.json({
      success: true,
      tests: {
        entityRegistered: true,
        tableName: metadata.tableName,
        tableExists: tableExists[0].exists,
        recordCount: count,
        sampleCount: templates.length,
        sampleData: templates
      }
    });
  } catch (error) {
    console.error('Debug: Error testing templates:', error);
    return NextResponse.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : 'Unknown'
      }
    }, { status: 500 });
  }
}