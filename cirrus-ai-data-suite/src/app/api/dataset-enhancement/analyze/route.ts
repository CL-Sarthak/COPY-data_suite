import { NextRequest, NextResponse } from 'next/server';
import { DatasetEnhancementService } from '@/services/datasetEnhancementService';

// POST /api/dataset-enhancement/analyze - Analyze dataset and suggest missing fields
export async function POST(request: NextRequest) {
  try {
    console.log('=== Dataset Enhancement Analysis API: Starting analysis ===');
    
    const body = await request.json();
    const { sampleRecord, dataSourceId } = body;

    if (!sampleRecord) {
      return NextResponse.json(
        { error: 'Sample record is required for analysis' },
        { status: 400 }
      );
    }

    console.log('Analyzing sample record:', {
      dataSourceId,
      fields: Object.keys(sampleRecord),
      recordSize: JSON.stringify(sampleRecord).length
    });

    // Analyze the sample record to suggest missing fields
    const analysis = await DatasetEnhancementService.analyzeMissingFields(sampleRecord);
    
    console.log('=== Dataset Enhancement Analysis API: Analysis complete ===', {
      datasetType: analysis.datasetType,
      missingFieldsCount: analysis.missingFields.length,
      confidence: analysis.analysisConfidence
    });

    return NextResponse.json({
      success: true,
      analysis,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('=== Dataset Enhancement Analysis API: Error ===', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to analyze dataset',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}