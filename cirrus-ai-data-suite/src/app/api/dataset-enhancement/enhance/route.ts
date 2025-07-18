import { NextRequest, NextResponse } from 'next/server';
import { DatasetEnhancementService, MissingFieldSuggestion } from '@/services/datasetEnhancementService';
import { apiLogger } from '@/utils/logger';

export interface EnhanceDatasetRequest {
  dataSourceId: string;
  records: Record<string, unknown>[];
  selectedFields: MissingFieldSuggestion[];
  enhancementName?: string;
}

// POST /api/dataset-enhancement/enhance - Add selected fields to dataset
export async function POST(request: NextRequest) {
  try {
    apiLogger.log('=== Dataset Enhancement API: Starting enhancement ===');
    
    const body: EnhanceDatasetRequest = await request.json();
    const { dataSourceId, records, selectedFields, enhancementName } = body;

    if (!records || !Array.isArray(records) || records.length === 0) {
      return NextResponse.json(
        { error: 'Records array is required for enhancement' },
        { status: 400 }
      );
    }

    if (!selectedFields || !Array.isArray(selectedFields) || selectedFields.length === 0) {
      return NextResponse.json(
        { error: 'Selected fields are required for enhancement' },
        { status: 400 }
      );
    }

    apiLogger.debug('Enhancing dataset:', {
      dataSourceId,
      recordCount: records.length,
      fieldsToAdd: selectedFields.map(f => f.fieldName),
      enhancementName
    });

    // Generate enhanced records with new fields
    const enhancedRecords = records.map((record) => {
      const enhancedRecord = { ...record };
      
      // Add each selected field
      selectedFields.forEach(fieldSuggestion => {
        const { fieldName, fieldType, dependencies } = fieldSuggestion;
        
        // Prepare dependent field data if dependencies exist
        const dependentFields: Record<string, unknown> = {};
        if (dependencies) {
          dependencies.forEach(depField => {
            if (record[depField] !== undefined) {
              dependentFields[depField] = record[depField];
            }
          });
        }
        
        // Generate the field data
        const fieldValue = DatasetEnhancementService.generateFieldData(
          {
            fieldName,
            fieldType,
            dependentFields,
            datasetContext: record
          },
          record
        );
        
        enhancedRecord[fieldName] = fieldValue;
      });
      
      return enhancedRecord;
    });

    // Calculate enhancement statistics
    const originalFieldCount = Object.keys(records[0] || {}).length;
    const newFieldCount = selectedFields.length;
    const totalFieldCount = originalFieldCount + newFieldCount;
    
    const enhancementStats = {
      originalRecords: records.length,
      enhancedRecords: enhancedRecords.length,
      originalFields: originalFieldCount,
      addedFields: newFieldCount,
      totalFields: totalFieldCount,
      fieldsAdded: selectedFields.map(f => ({
        name: f.fieldName,
        type: f.fieldType,
        description: f.description
      }))
    };

    apiLogger.log('=== Dataset Enhancement API: Enhancement complete ===', enhancementStats);

    return NextResponse.json({
      success: true,
      enhancedRecords,
      enhancementStats,
      enhancementName: enhancementName || `Enhanced ${dataSourceId}`,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    apiLogger.error('=== Dataset Enhancement API: Error ===', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to enhance dataset',
        details: process.env.NODE_ENV === 'development' ? error : undefined
      },
      { status: 500 }
    );
  }
}