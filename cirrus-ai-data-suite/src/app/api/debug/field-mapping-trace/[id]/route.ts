import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/database/connection';
import { DataSourceEntity } from '@/entities/DataSourceEntity';
import { FieldMappingEntity } from '@/entities/FieldMappingEntity';
import { CatalogFieldEntity } from '@/entities/CatalogFieldEntity';

// GET /api/debug/field-mapping-trace/[id] - Debug field mapping for a data source
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = await getDatabase();
    
    // Get data source
    const dataSourceRepo = db.getRepository(DataSourceEntity);
    const dataSource = await dataSourceRepo.findOne({ where: { id } });
    
    if (!dataSource) {
      return NextResponse.json({ error: 'Data source not found' }, { status: 404 });
    }
    
    // Get field mappings
    const mappingRepo = db.getRepository(FieldMappingEntity);
    const mappings = await mappingRepo.find({ where: { sourceId: id } });
    
    // Get catalog fields
    const catalogRepo = db.getRepository(CatalogFieldEntity);
    const catalogFieldIds = mappings.map(m => m.catalogFieldId);
    const catalogFields = catalogFieldIds.length > 0 
      ? await catalogRepo.findByIds(catalogFieldIds)
      : [];
    
    // Parse transformed data to see actual field names
    let transformedFieldNames: string[] = [];
    let sampleTransformedRecord: Record<string, unknown> | null = null;
    
    if (dataSource.transformedData) {
      try {
        const parsed = JSON.parse(dataSource.transformedData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          transformedFieldNames = Object.keys(parsed[0]);
          sampleTransformedRecord = parsed[0];
        } else if (parsed && parsed.records && Array.isArray(parsed.records) && parsed.records.length > 0) {
          const firstRecord = parsed.records[0];
          const recordData = firstRecord.data || firstRecord;
          transformedFieldNames = Object.keys(recordData);
          sampleTransformedRecord = recordData;
        }
      } catch {
        // Ignore parse errors
      }
    }
    
    // Build mapping trace
    const mappingTrace = mappings.map(mapping => {
      const catalogField = catalogFields.find(cf => cf.id === mapping.catalogFieldId);
      return {
        sourceFieldName: mapping.sourceFieldName,
        catalogFieldId: mapping.catalogFieldId,
        catalogFieldName: catalogField?.name || 'NOT_FOUND',
        catalogFieldDisplayName: catalogField?.displayName || 'NOT_FOUND',
        isFieldInTransformedData: transformedFieldNames.includes(catalogField?.name || ''),
        actualValueInTransformed: sampleTransformedRecord?.[catalogField?.name || ''] || null
      };
    });
    
    return NextResponse.json({
      dataSource: {
        id: dataSource.id,
        name: dataSource.name,
        hasTransformedData: !!dataSource.transformedData,
        transformationAppliedAt: dataSource.transformationAppliedAt,
        recordCount: dataSource.recordCount
      },
      fieldMappings: mappingTrace,
      transformedDataFieldNames: transformedFieldNames,
      sampleTransformedRecord,
      debug: {
        totalMappings: mappings.length,
        catalogFieldsFound: catalogFields.length,
        transformedFieldCount: transformedFieldNames.length
      }
    });
    
  } catch (error) {
    console.error('Debug trace error:', error);
    return NextResponse.json(
      { error: 'Failed to trace field mappings' },
      { status: 500 }
    );
  }
}