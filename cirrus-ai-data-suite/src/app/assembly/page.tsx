'use client';

import { useState } from 'react';
import AppLayout from '@/components/AppLayout';
import { useDialog } from '@/contexts/DialogContext';
import { 
  CircleStackIcon,
  FunnelIcon,
  ShieldCheckIcon,
  PlusIcon,
  PlayIcon,
  DocumentDuplicateIcon,
  CheckCircleIcon,
  TableCellsIcon,
  EyeIcon,
  CogIcon
} from '@heroicons/react/24/outline';

interface DataSource {
  id: string;
  name: string;
  type: string;
  tables: {
    name: string;
    schema: string;
    columns: Column[];
    rowCount: number;
  }[];
}

interface Column {
  name: string;
  type: string;
  nullable: boolean;
  containsPII?: boolean;
  piiType?: string;
}


interface DataSet {
  id: string;
  name: string;
  description: string;
  sources: SelectedSource[];
  transformations: Transformation[];
  outputFormat: 'json' | 'csv' | 'parquet' | 'sql';
  recordCount?: number;
  lastModified: Date;
  status: 'draft' | 'processing' | 'ready' | 'error';
}

interface SelectedSource {
  sourceId: string;
  sourceName: string;
  tables: {
    tableName: string;
    columns: string[];
    filters?: Record<string, unknown>[];
  }[];
}

interface Transformation {
  id: string;
  type: 'redact' | 'filter' | 'aggregate' | 'join' | 'synthetic';
  configuration: Record<string, unknown>;
  order: number;
}

export default function DataAssembly() {
  const dialog = useDialog();
  const [dataSources] = useState<DataSource[]>([]);
  const [dataSets, setDataSets] = useState<DataSet[]>([]);
  const [selectedDataSet, setSelectedDataSet] = useState<DataSet | null>(null);

  const transformationTypes = [
    { value: 'redact', label: 'Apply Redaction Patterns', icon: ShieldCheckIcon },
    { value: 'filter', label: 'Filter Records', icon: FunnelIcon },
    { value: 'aggregate', label: 'Aggregate Data', icon: TableCellsIcon },
    { value: 'synthetic', label: 'Generate Synthetic', icon: CogIcon }
  ];

  const getStatusColor = (status: DataSet['status']) => {
    switch (status) {
      case 'ready': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'error': return 'bg-red-100 text-red-800';
    }
  };

  const buildDataSet = (dataSetId: string) => {
    setDataSets(prev => prev.map(ds => 
      ds.id === dataSetId ? { ...ds, status: 'processing' } : ds
    ));

    // Simulate processing
    setTimeout(() => {
      setDataSets(prev => prev.map(ds => 
        ds.id === dataSetId ? { ...ds, status: 'ready' } : ds
      ));
    }, 3000);
  };

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Data Assembly</h1>
              <p className="text-gray-600 mt-1">Compose and transform datasets for AI training</p>
            </div>
            <button
              onClick={() => dialog.showAlert({
                title: 'Coming Soon',
                message: 'Dataset creation functionality is coming soon.',
                type: 'info'
              })}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="h-5 w-5" />
              New Dataset
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Dataset List */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="p-4 border-b border-gray-200">
                  <h2 className="font-semibold text-gray-900">Training Datasets</h2>
                </div>
                <div className="divide-y divide-gray-200">
                  {dataSets.length === 0 ? (
                    <div className="p-12 text-center">
                      <CircleStackIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No Training Datasets</h3>
                      <p className="text-gray-600 mb-6 max-w-md mx-auto">
                        Assemble your first training dataset by combining data sources, applying transformations, and configuring output formats.
                      </p>
                      <button
                        onClick={() => dialog.showAlert({
                          title: 'Coming Soon',
                          message: 'Dataset creation functionality is coming soon.',
                          type: 'info'
                        })}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <PlusIcon className="h-5 w-5" />
                        Create Training Dataset
                      </button>
                      
                      <div className="mt-8 text-sm text-gray-600">
                        <p className="mb-2">First, make sure you have:</p>
                        <ul className="text-left max-w-sm mx-auto space-y-1">
                          <li className="flex items-center gap-2">
                            <CheckCircleIcon className="h-4 w-4 text-gray-400" />
                            Connected data sources
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircleIcon className="h-4 w-4 text-gray-400" />
                            Defined sensitive patterns
                          </li>
                          <li className="flex items-center gap-2">
                            <CheckCircleIcon className="h-4 w-4 text-gray-400" />
                            Generated synthetic data (optional)
                          </li>
                        </ul>
                      </div>
                    </div>
                  ) : (
                    dataSets.map(dataSet => (
                    <div
                      key={dataSet.id}
                      className={`p-4 hover:bg-gray-50 cursor-pointer ${
                        selectedDataSet?.id === dataSet.id ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => setSelectedDataSet(dataSet)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <CircleStackIcon className="h-5 w-5 text-blue-600" />
                            <h3 className="font-medium text-gray-900">{dataSet.name}</h3>
                            <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(dataSet.status)}`}>
                              {dataSet.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{dataSet.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <span>Sources: {dataSet.sources.length}</span>
                            <span>Transforms: {dataSet.transformations.length}</span>
                            {dataSet.recordCount && <span>Records: {dataSet.recordCount.toLocaleString()}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              buildDataSet(dataSet.id);
                            }}
                            disabled={dataSet.status === 'processing'}
                            className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                          >
                            {dataSet.status === 'processing' ? (
                              <>
                                <CogIcon className="h-4 w-4 animate-spin" />
                                Building...
                              </>
                            ) : (
                              <>
                                <PlayIcon className="h-4 w-4" />
                                Build
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )))
                  }
                </div>
              </div>

              {/* Transformation Pipeline */}
              {selectedDataSet && (
                <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Transformation Pipeline</h3>
                  
                  <div className="space-y-4">
                    {/* Data Sources */}
                    <div className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <CircleStackIcon className="h-5 w-5 text-gray-600" />
                        <h4 className="font-medium text-gray-900">Data Sources</h4>
                      </div>
                      {selectedDataSet.sources.map((source, idx) => (
                        <div key={idx} className="ml-8 mb-2">
                          <p className="font-medium text-sm">{source.sourceName}</p>
                          {source.tables.map((table, tidx) => (
                            <div key={tidx} className="ml-4 text-sm text-gray-600">
                              <span className="font-mono">{table.tableName}</span>
                              <span className="text-gray-400"> → </span>
                              <span>{table.columns.join(', ')}</span>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>

                    {/* Transformations */}
                    {selectedDataSet.transformations.map((transform) => (
                      <div key={transform.id} className="relative">
                        <div className="absolute left-6 -top-4 -bottom-4 w-0.5 bg-gray-300"></div>
                        <div className="relative border border-gray-200 rounded-lg p-4 bg-white">
                          <div className="flex items-center gap-3">
                            <div className="bg-blue-100 p-2 rounded-full">
                              {(() => {
                                const IconComponent = transformationTypes.find(t => t.value === transform.type)?.icon;
                                return IconComponent ? <IconComponent className="h-4 w-4 text-blue-600" /> : null;
                              })()}
                            </div>
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">
                                {transformationTypes.find(t => t.value === transform.type)?.label}
                              </h4>
                              <p className="text-sm text-gray-600">
                                {transform.type === 'redact' && Array.isArray(transform.configuration.patterns) && `Patterns: ${(transform.configuration.patterns as string[]).join(', ')}`}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Output */}
                    <div className="border border-green-200 bg-green-50 rounded-lg p-4">
                      <div className="flex items-center gap-3">
                        <DocumentDuplicateIcon className="h-5 w-5 text-green-600" />
                        <div>
                          <h4 className="font-medium text-gray-900">Output Dataset</h4>
                          <p className="text-sm text-gray-600">
                            Format: {selectedDataSet.outputFormat.toUpperCase()} • 
                            {selectedDataSet.recordCount && ` ${selectedDataSet.recordCount.toLocaleString()} records`}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                    <PlusIcon className="h-4 w-4" />
                    Add Transformation
                  </button>
                </div>
              )}
            </div>

            {/* Data Preview */}
            <div>
              {selectedDataSet ? (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-gray-900">Dataset Preview</h3>
                    <button className="text-sm text-blue-600 hover:text-blue-800">
                      <EyeIcon className="h-4 w-4 inline mr-1" />
                      View Sample
                    </button>
                  </div>
                  
                  <dl className="space-y-4 text-sm">
                    <div>
                      <dt className="text-gray-600">Status</dt>
                      <dd>
                        <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(selectedDataSet.status)}`}>
                          {selectedDataSet.status}
                        </span>
                      </dd>
                    </div>
                    
                    <div>
                      <dt className="text-gray-600">Last Modified</dt>
                      <dd className="text-gray-900">
                        {selectedDataSet.lastModified.toLocaleString()}
                      </dd>
                    </div>
                    
                    <div>
                      <dt className="text-gray-600">Output Format</dt>
                      <dd className="font-medium uppercase">{selectedDataSet.outputFormat}</dd>
                    </div>
                    
                    <div>
                      <dt className="text-gray-600">Total Records</dt>
                      <dd className="font-medium">
                        {selectedDataSet.recordCount?.toLocaleString() || 'Calculating...'}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <h4 className="font-medium text-gray-900 mb-3">Actions</h4>
                    <div className="space-y-2">
                      <button className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                        Deploy to Environment
                      </button>
                      <button className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200">
                        Download Sample
                      </button>
                      <button className="w-full px-4 py-2 text-red-600 hover:bg-red-50 rounded">
                        Delete Dataset
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="text-center text-gray-500">
                    <CircleStackIcon className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>Select a dataset to view details</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Available Data Sources */}
          <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Available Data Sources</h2>
            {dataSources.length === 0 ? (
              <div className="text-center py-8">
                <CircleStackIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No data sources available</p>
                <p className="text-sm text-gray-600 mb-4">
                  Connect data sources in the Data Discovery module to use them in your datasets.
                </p>
                <a
                  href="/discovery"
                  className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium"
                >
                  Go to Data Discovery →
                </a>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  Select tables and columns from your connected data sources to build datasets.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dataSources.map(source => (
                <div key={source.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CircleStackIcon className="h-5 w-5 text-gray-600" />
                    <h3 className="font-medium text-gray-900">{source.name}</h3>
                    <span className="text-xs text-gray-500 uppercase">{source.type}</span>
                  </div>
                  
                  {source.tables.map(table => (
                    <div key={table.name} className="ml-7 mb-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-mono text-gray-700">{table.name}</span>
                        <span className="text-xs text-gray-500">{table.rowCount.toLocaleString()} rows</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {table.columns.filter(c => c.containsPII).length} PII columns
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}