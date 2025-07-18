import { NextResponse } from 'next/server';
import { DataSourceService } from '@/services/dataSourceService';

// POST /api/data-sources/seed - Create sample data sources for testing
export async function POST() {
  try {
    const sampleDataSources = [
      {
        name: 'Customer Database',
        type: 'database' as const,
        connectionStatus: 'connected' as const,
        configuration: {
          host: 'localhost',
          database: 'customers',
          table: 'users'
        },
        metadata: {
          fields: [
            { name: 'id', type: 'integer', primary: true },
            { name: 'first_name', type: 'varchar' },
            { name: 'last_name', type: 'varchar' },
            { name: 'email', type: 'varchar' },
            { name: 'phone', type: 'varchar' },
            { name: 'created_at', type: 'timestamp' },
            { name: 'updated_at', type: 'timestamp' }
          ]
        },
        recordCount: 15000
      },
      {
        name: 'Product API',
        type: 'api' as const,
        connectionStatus: 'connected' as const,
        configuration: {
          endpoint: 'https://api.example.com/products',
          method: 'GET'
        },
        metadata: {
          fields: [
            { name: 'product_id', type: 'integer' },
            { name: 'title', type: 'varchar' },
            { name: 'description', type: 'text' },
            { name: 'price', type: 'decimal' },
            { name: 'category', type: 'varchar' },
            { name: 'in_stock', type: 'boolean' }
          ]
        },
        recordCount: 5000
      },
      {
        name: 'Log Files',
        type: 'filesystem' as const,
        connectionStatus: 'connected' as const,
        configuration: {
          path: '/var/log/application.log',
          format: 'json'
        },
        metadata: {
          fields: [
            { name: 'timestamp', type: 'timestamp' },
            { name: 'level', type: 'varchar' },
            { name: 'message', type: 'text' },
            { name: 'user_id', type: 'integer' },
            { name: 'session_id', type: 'varchar' }
          ]
        },
        recordCount: 100000
      }
    ];

    const created = [];
    for (const dataSource of sampleDataSources) {
      const result = await DataSourceService.createDataSource(dataSource);
      created.push(result);
    }

    return NextResponse.json({ 
      message: `Created ${created.length} sample data sources`,
      dataSources: created 
    });
  } catch (error) {
    console.error('Error creating sample data sources:', error);
    return NextResponse.json(
      { error: 'Failed to create sample data sources' },
      { status: 500 }
    );
  }
}