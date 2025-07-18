import { NextResponse } from 'next/server';
import { getDatabase } from '@/database/connection';
import { SyntheticDataset } from '@/entities/SyntheticDataset';
import { SyntheticDataJob } from '@/entities/SyntheticDataJob';

export async function GET() {
  try {
    console.log('Database health check starting...');
    const db = await getDatabase();
    console.log('Database connection established');
    
    // Test basic connection
    const isConnected = db.isInitialized;
    console.log('Database initialized:', isConnected);
    
    // Test entity repositories
    const datasetRepo = db.getRepository(SyntheticDataset);
    const jobRepo = db.getRepository(SyntheticDataJob);
    
    console.log('Dataset repository:', !!datasetRepo);
    console.log('Job repository:', !!jobRepo);
    
    // Try a simple query
    const datasetCount = await datasetRepo.count();
    const jobCount = await jobRepo.count();
    
    console.log('Dataset count:', datasetCount);
    console.log('Job count:', jobCount);
    
    return NextResponse.json({
      status: 'healthy',
      connected: isConnected,
      datasets: datasetCount,
      jobs: jobCount
    });
  } catch (error) {
    console.error('Database health check failed:', error);
    return NextResponse.json({
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}