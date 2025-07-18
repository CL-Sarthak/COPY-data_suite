import { NextRequest, NextResponse } from 'next/server';
import { QueryContextService } from '@/services/queryContextService';
import { logger } from '@/utils/logger';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const fieldSearch = searchParams.get('field') || '';
    
    logger.info('Debug metadata request:', { fieldSearch });

    // Gather full context
    const context = await QueryContextService.gatherFullContext();
    
    // If searching for a specific field
    if (fieldSearch) {
      const searchLower = fieldSearch.toLowerCase();
      
      // Search in tables for columns
      const matchingTables = context.tables.filter(table => {
        if (table.columns) {
          return table.columns.some(col => 
            col.name.toLowerCase().includes(searchLower)
          );
        }
        return false;
      });
      
      // Search in fields
      const matchingFields = context.fields.filter(field => 
        field.fieldName.toLowerCase().includes(searchLower) ||
        field.displayName.toLowerCase().includes(searchLower)
      );
      
      // Search in annotations
      const matchingAnnotations = context.annotations.filter(ann =>
        ann.fieldName.toLowerCase().includes(searchLower) ||
        ann.fieldPath.toLowerCase().includes(searchLower)
      );
      
      return NextResponse.json({
        search: fieldSearch,
        results: {
          tables: matchingTables.map(t => ({
            dataSource: t.dataSourceName,
            table: t.tableName,
            columns: t.columns?.filter(col => 
              col.name.toLowerCase().includes(searchLower)
            )
          })),
          fields: matchingFields,
          annotations: matchingAnnotations
        },
        summary: {
          tablesWithField: matchingTables.length,
          fieldsFound: matchingFields.length,
          annotationsFound: matchingAnnotations.length
        }
      });
    }
    
    // Return full metadata summary
    const summary = {
      dataSources: {
        total: context.dataSources.length,
        types: context.dataSources.reduce((acc, ds) => {
          acc[ds.type] = (acc[ds.type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      },
      tables: {
        total: context.tables.length,
        withColumns: context.tables.filter(t => t.columns && t.columns.length > 0).length,
        sample: context.tables.slice(0, 5).map(t => ({
          name: t.tableName,
          dataSource: t.dataSourceName,
          columnCount: t.columns?.length || 0,
          sampleColumns: t.columns?.slice(0, 5).map(c => c.name) || []
        }))
      },
      fields: {
        total: context.fields.length,
        withTableInfo: context.fields.filter(f => f.tableName).length,
        categories: context.fields.reduce((acc, f) => {
          const cat = f.category || 'uncategorized';
          acc[cat] = (acc[cat] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      },
      annotations: {
        total: context.annotations.length,
        withPII: context.annotations.filter(a => a.isPII).length
      },
      relationships: {
        total: context.relationships?.length || 0
      }
    };
    
    return NextResponse.json({
      summary,
      fullContext: {
        dataSources: context.dataSources,
        tables: context.tables,
        fields: context.fields,
        annotations: context.annotations,
        relationships: context.relationships
      }
    });
    
  } catch (error) {
    logger.error('Failed to debug metadata:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to debug metadata' },
      { status: 500 }
    );
  }
}