'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DatabaseConnection, TableInfo } from '@/types/connector';
import AppLayout from '@/components/AppLayout';
import { 
  ArrowLeft, 
  Database, 
  Table,
  Eye,
  Download,
  Loader2,
  Key,
  Hash,
  Type,
  Calendar,
  ToggleLeft,
  List
} from 'lucide-react';

interface TableColumn {
  name: string;
  dataType: string;
  nullable: boolean;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  defaultValue?: unknown;
  maxLength?: number;
  precision?: number;
  scale?: number;
}

interface TableDetails extends TableInfo {
  columns: TableColumn[];
}

export default function TableDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const connectionId = params?.id as string;
  const tableName = decodeURIComponent(params?.tableName as string);

  const [connection, setConnection] = useState<DatabaseConnection | null>(null);
  const [tableDetails, setTableDetails] = useState<TableDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionId, tableName]);

  const loadData = async () => {
    try {
      // Load connection details
      const connResponse = await fetch(`/api/database-connections/${connectionId}`);
      if (!connResponse.ok) throw new Error('Failed to load connection');
      const connData = await connResponse.json();
      setConnection(connData);

      // Load table schema
      const schemaResponse = await fetch(`/api/database-connections/${connectionId}/schema`);
      if (!schemaResponse.ok) throw new Error('Failed to load schema');
      const schemaData = await schemaResponse.json();
      
      // Find the specific table
      const table = schemaData.tables.find((t: TableInfo) => t.name === tableName);
      if (!table) throw new Error('Table not found');
      
      setTableDetails(table);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load table details');
      console.error('Failed to load table details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getColumnIcon = (dataType: string | undefined) => {
    if (!dataType) {
      return <Type className="h-4 w-4 text-gray-500" />;
    }
    const lowerType = dataType.toLowerCase();
    if (lowerType.includes('int') || lowerType.includes('numeric') || lowerType.includes('decimal')) {
      return <Hash className="h-4 w-4 text-blue-500" />;
    }
    if (lowerType.includes('varchar') || lowerType.includes('text') || lowerType.includes('char')) {
      return <Type className="h-4 w-4 text-green-500" />;
    }
    if (lowerType.includes('date') || lowerType.includes('time')) {
      return <Calendar className="h-4 w-4 text-purple-500" />;
    }
    if (lowerType.includes('bool')) {
      return <ToggleLeft className="h-4 w-4 text-orange-500" />;
    }
    if (lowerType.includes('json')) {
      return <List className="h-4 w-4 text-indigo-500" />;
    }
    return <Type className="h-4 w-4 text-gray-500" />;
  };

  const formatDataType = (
    dataType: string | undefined, 
    maxLength?: number,
    precision?: number,
    scale?: number
  ): string => {
    if (!dataType) return 'UNKNOWN';
    
    const typeMap: Record<string, string> = {
      'character varying': 'VARCHAR',
      'character': 'CHAR',
      'integer': 'INTEGER',
      'bigint': 'BIGINT',
      'smallint': 'SMALLINT',
      'numeric': 'NUMERIC',
      'decimal': 'DECIMAL',
      'real': 'REAL',
      'double precision': 'DOUBLE',
      'text': 'TEXT',
      'boolean': 'BOOLEAN',
      'date': 'DATE',
      'time without time zone': 'TIME',
      'time with time zone': 'TIMETZ',
      'timestamp without time zone': 'TIMESTAMP',
      'timestamp with time zone': 'TIMESTAMPTZ',
      'json': 'JSON',
      'jsonb': 'JSONB',
      'uuid': 'UUID',
      'bytea': 'BYTEA',
      'array': 'ARRAY'
    };

    const formattedType = typeMap[dataType.toLowerCase()] || dataType.toUpperCase();
    
    // Add length for character types
    if (maxLength && (formattedType === 'VARCHAR' || formattedType === 'CHAR')) {
      return `${formattedType}(${maxLength})`;
    }
    
    // Add precision and scale for numeric types
    if (precision && (formattedType === 'NUMERIC' || formattedType === 'DECIMAL')) {
      if (scale) {
        return `${formattedType}(${precision},${scale})`;
      }
      return `${formattedType}(${precision})`;
    }
    
    return formattedType;
  };

  const getTypeDescription = (dataType: string | undefined): string => {
    if (!dataType) return 'Unknown data type';
    
    const descriptions: Record<string, string> = {
      'character varying': 'Variable-length character string',
      'varchar': 'Variable-length character string',
      'character': 'Fixed-length character string',
      'char': 'Fixed-length character string',
      'integer': '32-bit signed integer (-2,147,483,648 to 2,147,483,647)',
      'bigint': '64-bit signed integer',
      'smallint': '16-bit signed integer (-32,768 to 32,767)',
      'numeric': 'Exact numeric with selectable precision',
      'decimal': 'Exact numeric with selectable precision',
      'real': '32-bit floating point number',
      'double precision': '64-bit floating point number',
      'text': 'Variable unlimited length character string',
      'boolean': 'True or false value',
      'date': 'Calendar date (year, month, day)',
      'time without time zone': 'Time of day without timezone',
      'time with time zone': 'Time of day with timezone',
      'timestamp without time zone': 'Date and time without timezone',
      'timestamp with time zone': 'Date and time with timezone',
      'json': 'JSON text data',
      'jsonb': 'Binary JSON data (more efficient)',
      'uuid': 'Universally unique identifier',
      'bytea': 'Binary data (byte array)',
      'array': 'Array of values'
    };

    return descriptions[dataType.toLowerCase()] || `${dataType} data type`;
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (error || !connection || !tableDetails) {
    return (
      <AppLayout>
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <p className="text-red-800">{error || 'Failed to load table details'}</p>
            <button
              className="mt-4 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              onClick={() => router.push(`/sources/databases/${connectionId}`)}
            >
              Back to Database
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push(`/sources/databases/${connectionId}`)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to {connection.name}
          </button>

          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Table className="h-8 w-8 text-gray-700" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {tableDetails.schema && tableDetails.schema !== 'public' && (
                    <span className="text-gray-600">{tableDetails.schema}.</span>
                  )}
                  {tableDetails.name}
                </h1>
                <p className="text-gray-600">
                  {tableDetails.columns.length} columns
                  {tableDetails.rowCount !== undefined && (
                    <> • {new Intl.NumberFormat().format(tableDetails.rowCount)} rows</>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => router.push(`/sources/databases/${connectionId}/tables/${encodeURIComponent(tableName)}/preview`)}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Eye className="mr-2 h-4 w-4" />
                Preview Data
              </button>
              <button
                onClick={() => router.push(`/sources/databases/${connectionId}/tables/${encodeURIComponent(tableName)}/import`)}
                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Download className="mr-2 h-4 w-4" />
                Import as Data Source
              </button>
            </div>
          </div>
        </div>

        {/* Table Schema */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Schema</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Column
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nullable
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Key
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Default
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tableDetails.columns.map((column) => (
                  <tr key={column.name} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getColumnIcon(column.dataType)}
                        <span className="ml-2 text-sm font-medium text-gray-900">
                          {column.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span 
                        className="font-mono cursor-help"
                        title={getTypeDescription(column.dataType)}
                      >
                        {formatDataType(column.dataType, column.maxLength, column.precision, column.scale)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {column.nullable ? 'Yes' : 'No'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {column.isPrimaryKey && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          <Key className="mr-1 h-3 w-3" />
                          Primary
                        </span>
                      )}
                      {column.isForeignKey && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 ml-1">
                          <Key className="mr-1 h-3 w-3" />
                          Foreign
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {column.defaultValue ? String(column.defaultValue) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Foreign Keys */}
        {tableDetails.foreignKeys && tableDetails.foreignKeys.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Foreign Keys</h2>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {tableDetails.foreignKeys.map((fk) => (
                  <div key={fk.constraintName} className="flex items-center text-sm">
                    <Key className="h-4 w-4 text-purple-500 mr-2" />
                    <span className="font-medium text-gray-900">{fk.columnName}</span>
                    <span className="mx-2 text-gray-500">→</span>
                    <span className="text-gray-600">
                      {fk.referencedTable}.{fk.referencedColumn}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Indexes */}
        {tableDetails.indexes && tableDetails.indexes.length > 0 && (
          <div className="mt-6 bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Indexes</h2>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {tableDetails.indexes.map((index) => (
                  <div key={index.name} className="flex items-center justify-between">
                    <div className="flex items-center text-sm">
                      <Database className="h-4 w-4 text-blue-500 mr-2" />
                      <span className="font-medium text-gray-900">{index.name}</span>
                      <span className="ml-2 text-gray-600">
                        ({Array.isArray(index.columns) ? index.columns.join(', ') : 'Unknown'})
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {index.isPrimary && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                          Primary
                        </span>
                      )}
                      {index.isUnique && !index.isPrimary && (
                        <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          Unique
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}