import { NextRequest, NextResponse } from 'next/server';
import { DataSourceService } from '@/services/dataSourceService';
import { logger } from '@/utils/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const dataSource = await DataSourceService.getDataSourceById(id);
    if (!dataSource) {
      return NextResponse.json({ error: 'Data source not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      keywords: dataSource.aiKeywords ? JSON.parse(dataSource.aiKeywords) : [],
      keywordsGeneratedAt: dataSource.keywordsGeneratedAt
    });
  } catch (error) {
    logger.error('Failed to get keywords:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get keywords' },
      { status: 500 }
    );
  }
}