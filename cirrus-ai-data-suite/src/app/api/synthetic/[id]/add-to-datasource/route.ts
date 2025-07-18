import { NextRequest, NextResponse } from 'next/server';
import { SyntheticDataService } from '@/services/syntheticDataService';
import { DataSourceService } from '@/services/dataSourceService';
import { readFile } from 'fs/promises';

// POST /api/synthetic/[id]/add-to-datasource - Add synthetic dataset as a new data source
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name: dataSourceName } = body;

    if (!dataSourceName) {
      return NextResponse.json(
        { error: 'Data source name is required' },
        { status: 400 }
      );
    }

    const dataset = await SyntheticDataService.getDataset(id);
    if (!dataset) {
      return NextResponse.json(
        { error: 'Dataset not found' },
        { status: 404 }
      );
    }

    if (dataset.status !== 'completed') {
      return NextResponse.json(
        { error: 'Dataset not ready. Please generate the data first.' },
        { status: 400 }
      );
    }

    try {
      // Get the generated content from the database (for production) or file system (for dev)
      let fileContent: string;
      
      // First try to get content from database (production-friendly)
      if (dataset.generatedContent) {
        fileContent = dataset.generatedContent;
      } else if (dataset.filePath) {
        // Fallback to reading from file system (dev environment)
        try {
          fileContent = await readFile(dataset.filePath, 'utf8');
        } catch (fsError) {
          console.error('File system read failed, dataset may need regeneration:', fsError);
          return NextResponse.json(
            { error: 'Generated data not found. Please regenerate the dataset.' },
            { status: 404 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'No generated data found. Please generate the dataset first.' },
          { status: 404 }
        );
      }
      
      let parsedData: Record<string, unknown>[];

      // Parse based on output format
      if (dataset.outputFormat === 'json') {
        parsedData = JSON.parse(fileContent);
      } else {
        return NextResponse.json(
          { error: 'Only JSON format is currently supported for data source creation' },
          { status: 400 }
        );
      }

      // Create data source configuration
      const dataSourceConfig = {
        name: dataSourceName,
        type: 'json_transformed' as const,
        connectionStatus: 'connected' as const,
        configuration: {
          files: [{
            name: `${dataSourceName}.json`,
            size: Buffer.byteLength(fileContent, 'utf8'),
            type: 'application/json',
            content: fileContent,
            lastModified: Date.now(),
            syntheticMetadata: {
              originalDatasetId: dataset.id,
              originalDatasetName: dataset.name,
              generatedAt: new Date().toISOString(),
              recordCount: parsedData.length,
              schema: dataset.schema
            }
          }],
          totalSize: Buffer.byteLength(fileContent, 'utf8'),
          recordCount: parsedData.length
        },
        metadata: {
          totalSize: Buffer.byteLength(fileContent, 'utf8'),
          lastModified: new Date(),
          dataTypes: ['synthetic'],
          // Store synthetic metadata in a custom way that fits the schema
          fields: Object.entries(dataset.schema as Record<string, { type: string }>).map(([name, def]) => ({
            name,
            type: def.type,
            primary: name === 'id'
          }))
        },
        recordCount: parsedData.length
      };

      // Create the data source using the service directly
      const newDataSource = await DataSourceService.createDataSource(dataSourceConfig);

      return NextResponse.json({
        success: true,
        dataSource: newDataSource,
        message: `Synthetic dataset "${dataset.name}" has been added as data source "${dataSourceName}"`
      });

    } catch (fileError) {
      console.error('Error reading generated file:', fileError);
      return NextResponse.json(
        { error: 'Generated file not found or corrupted' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error adding synthetic dataset to data sources:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add dataset as data source' },
      { status: 500 }
    );
  }
}