import { NextResponse } from 'next/server';
import { getDatabase } from '@/database/connection';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const checks = {
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        VERCEL: process.env.VERCEL,
        VERCEL_ENV: process.env.VERCEL_ENV,
        DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not set',
        DATABASE_SSL: process.env.DATABASE_SSL,
        SKIP_RUNTIME_MIGRATIONS: process.env.SKIP_RUNTIME_MIGRATIONS,
      },
      storage: {
        STORAGE_TYPE: process.env.STORAGE_TYPE || 'local',
        AWS_BUCKET: process.env.AWS_BUCKET ? 'Set' : 'Not set',
        AWS_REGION: process.env.AWS_REGION || 'Not set',
        AWS_ACCESS_KEY: process.env.AWS_ACCESS_KEY_ID ? 'Set' : 'Not set',
      },
      database: {
        connected: false,
        tables: [] as string[],
        entityCount: 0,
        error: null as string | null,
      },
      filesystem: {
        tmpWritable: false,
        uploadsDir: '',
        tmpError: null as string | null,
        uploadsExists: false,
      }
    };

    // Check database
    try {
      const db = await getDatabase();
      checks.database.connected = true;
      checks.database.entityCount = db.entityMetadatas.length;
      
      const tables = await db.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `);
      checks.database.tables = tables.map((t: { table_name: string }) => t.table_name);
    } catch (error) {
      checks.database.error = error instanceof Error ? error.message : 'Unknown error';
    }

    // Check filesystem
    try {
      // Check if we can write to /tmp
      const testFile = path.join('/tmp', 'test-write.txt');
      await fs.writeFile(testFile, 'test');
      await fs.unlink(testFile);
      checks.filesystem.tmpWritable = true;
    } catch (error) {
      checks.filesystem.tmpError = error instanceof Error ? error.message : 'Cannot write to /tmp';
    }

    // Check uploads directory
    const uploadsPath = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');
    checks.filesystem.uploadsDir = uploadsPath;
    
    try {
      await fs.access(uploadsPath);
      checks.filesystem.uploadsExists = true;
    } catch {
      checks.filesystem.uploadsExists = false;
    }

    return NextResponse.json(checks, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Debug check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}