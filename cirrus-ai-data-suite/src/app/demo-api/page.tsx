'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { 
  Panel, 
  Button, 
  LoadingState, 
  ErrorState, 
  EmptyState 
} from '@/features/shared/components';
import { useAPI } from '@/features/shared/hooks';
import { dataSourceAPI, syntheticAPI, patternAPI, utilityAPI } from '@/core/api';
import { DataSource } from '@/types/discovery';
import { Pattern } from '@/services/patternService';
import { 
  CircleStackIcon,
  SparklesIcon,
  ShieldCheckIcon,
  HeartIcon
} from '@heroicons/react/24/outline';

export default function APIServiceDemoPage() {
  const [activeTab, setActiveTab] = useState<'datasources' | 'synthetic' | 'patterns' | 'health'>('datasources');
  
  // Data Sources Demo
  const dataSources = useAPI(dataSourceAPI.getDataSources);
  const [selectedSource, setSelectedSource] = useState<DataSource | null>(null);
  
  // Synthetic Data Demo
  const syntheticDatasets = useAPI(syntheticAPI.getDatasets);
  const templates = useAPI(syntheticAPI.getTemplates);
  
  // Patterns Demo
  const patterns = useAPI(patternAPI.getPatterns);
  const [testText, setTestText] = useState('My email is john.doe@example.com and my SSN is 123-45-6789');
  // Pattern test state
  const [patternTestResult, setPatternTestResult] = useState<{
    totalMatches: number;
    matches: Array<{
      pattern: Pattern;
      matches: Array<{ text: string; start: number; end: number }>;
    }>;
  } | null>(null);
  const [testingPatterns, setTestingPatterns] = useState(false);
  
  // Health Check Demo
  const healthCheck = useAPI(utilityAPI.healthCheck);
  const dashboardStats = useAPI(utilityAPI.getDashboardStats);

  // Load initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      await Promise.all([
        dataSources.execute(),
        syntheticDatasets.execute(),
        patterns.execute(),
        healthCheck.execute()
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const tabs = [
    { id: 'datasources', label: 'Data Sources', icon: CircleStackIcon },
    { id: 'synthetic', label: 'Synthetic Data', icon: SparklesIcon },
    { id: 'patterns', label: 'Patterns', icon: ShieldCheckIcon },
    { id: 'health', label: 'Health & Stats', icon: HeartIcon }
  ];

  return (
    <AppLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">API Service Layer Demo</h1>
          <p className="text-gray-600">
            This page demonstrates the new centralized API service layer with TypeScript support
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'datasources' | 'synthetic' | 'patterns' | 'health')}
                  className={`
                    group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                    ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon className={`mr-2 h-5 w-5 ${activeTab === tab.id ? 'text-blue-500' : 'text-gray-400'}`} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="mt-6">
          {/* Data Sources Tab */}
          {activeTab === 'datasources' && (
            <div className="space-y-6">
              <Panel 
                title="Data Sources API" 
                description="Demonstrates dataSourceAPI service methods"
                action={
                  <Button 
                    variant="primary" 
                    size="sm"
                    onClick={() => dataSources.execute()}
                    loading={dataSources.loading}
                  >
                    Refresh
                  </Button>
                }
              >
                {dataSources.loading ? (
                  <LoadingState message="Loading data sources..." />
                ) : dataSources.error ? (
                  <ErrorState 
                    error={dataSources.error} 
                    onRetry={() => dataSources.execute()} 
                  />
                ) : !dataSources.data || dataSources.data.length === 0 ? (
                  <EmptyState
                    icon={<CircleStackIcon />}
                    title="No data sources"
                    description="Create a data source to see it here"
                  />
                ) : (
                  <div className="space-y-3">
                    {dataSources.data.map((source) => (
                      <div 
                        key={source.id}
                        className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                        onClick={() => setSelectedSource(source)}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium">{source.name}</h3>
                            <p className="text-sm text-gray-600">
                              Type: {source.type} | Records: {source.recordCount || 0}
                            </p>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            source.connectionStatus === 'connected' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {source.connectionStatus}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>

              {selectedSource && (
                <Panel title={`Selected: ${selectedSource.name}`}>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">ID:</span> {selectedSource.id}
                      </div>
                      <div>
                        <span className="font-medium">Type:</span> {selectedSource.type}
                      </div>
                      <div>
                        <span className="font-medium">Records:</span> {selectedSource.recordCount || 0}
                      </div>
                      <div>
                        <span className="font-medium">Has Transformed Data:</span>{' '}
                        {selectedSource.hasTransformedData ? 'Yes' : 'No'}
                      </div>
                    </div>
                    
                    <div className="flex gap-3">
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            const schema = await dataSourceAPI.getSchema(selectedSource.id);
                            console.log('Schema:', schema);
                            alert('Schema fetched! Check console for details.');
                          } catch (error) {
                            alert('Error fetching schema: ' + (error as Error).message);
                          }
                        }}
                      >
                        Get Schema
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={async () => {
                          try {
                            const profile = await dataSourceAPI.profileDataSource(selectedSource.id);
                            console.log('Profile:', profile);
                            alert('Profile fetched! Check console for details.');
                          } catch (error) {
                            alert('Error profiling: ' + (error as Error).message);
                          }
                        }}
                      >
                        Profile Data
                      </Button>
                    </div>
                  </div>
                </Panel>
              )}
            </div>
          )}

          {/* Synthetic Data Tab */}
          {activeTab === 'synthetic' && (
            <div className="space-y-6">
              <Panel 
                title="Synthetic Data API" 
                description="Demonstrates syntheticAPI service methods"
                action={
                  <div className="flex gap-3">
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => templates.execute()}
                      loading={templates.loading}
                    >
                      Load Templates
                    </Button>
                    <Button 
                      variant="primary" 
                      size="sm"
                      onClick={() => syntheticDatasets.execute()}
                      loading={syntheticDatasets.loading}
                    >
                      Refresh Datasets
                    </Button>
                  </div>
                }
              >
                {syntheticDatasets.loading ? (
                  <LoadingState message="Loading synthetic datasets..." />
                ) : syntheticDatasets.error ? (
                  <ErrorState 
                    error={syntheticDatasets.error} 
                    onRetry={() => syntheticDatasets.execute()} 
                  />
                ) : !syntheticDatasets.data || syntheticDatasets.data.length === 0 ? (
                  <EmptyState
                    icon={<SparklesIcon />}
                    title="No synthetic datasets"
                    description="Create a synthetic dataset to see it here"
                  />
                ) : (
                  <div className="space-y-3">
                    {syntheticDatasets.data.map((dataset) => (
                      <div key={dataset.id} className="p-4 border rounded-lg">
                        <h3 className="font-medium">{dataset.name}</h3>
                        <p className="text-sm text-gray-600">
                          Type: {dataset.dataType} | Records: {dataset.recordCount}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>

              {templates.data && (
                <Panel title="Available Templates">
                  <div className="grid grid-cols-3 gap-3">
                    {Object.keys(templates.data).map((template) => (
                      <div key={template} className="p-3 border rounded-lg text-center">
                        <span className="text-sm font-medium">{template}</span>
                      </div>
                    ))}
                  </div>
                </Panel>
              )}
            </div>
          )}

          {/* Patterns Tab */}
          {activeTab === 'patterns' && (
            <div className="space-y-6">
              <Panel 
                title="Pattern Detection API" 
                description="Demonstrates patternAPI service methods"
                action={
                  <Button 
                    variant="primary" 
                    size="sm"
                    onClick={() => patterns.execute()}
                    loading={patterns.loading}
                  >
                    Refresh
                  </Button>
                }
              >
                {patterns.loading ? (
                  <LoadingState message="Loading patterns..." />
                ) : patterns.error ? (
                  <ErrorState 
                    error={patterns.error} 
                    onRetry={() => patterns.execute()} 
                  />
                ) : !patterns.data || patterns.data.length === 0 ? (
                  <EmptyState
                    icon={<ShieldCheckIcon />}
                    title="No patterns"
                    description="Create patterns to detect sensitive data"
                  />
                ) : (
                  <div className="space-y-3">
                    {patterns.data.slice(0, 5).map((pattern) => (
                      <div key={pattern.id} className="p-3 border rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium">{pattern.name}</h4>
                            <p className="text-sm text-gray-600">{pattern.description}</p>
                          </div>
                          <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                            {pattern.category}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>

              <Panel title="Test Pattern Detection">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Test Text
                    </label>
                    <textarea
                      value={testText}
                      onChange={(e) => setTestText(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter text to test for patterns..."
                    />
                  </div>
                  
                  <Button
                    variant="primary"
                    onClick={async () => {
                      if (!patterns.data) return;
                      setTestingPatterns(true);
                      try {
                        // Simple pattern testing logic
                        const matches = [];
                        let totalMatches = 0;
                        
                        for (const pattern of patterns.data) {
                          if (pattern.regex && pattern.regex.length > 0) {
                            const regex = new RegExp(pattern.regex[0], 'gi');
                            const patternMatches = [];
                            let match;
                            
                            while ((match = regex.exec(testText)) !== null) {
                              patternMatches.push({
                                text: match[0],
                                start: match.index,
                                end: match.index + match[0].length
                              });
                              totalMatches++;
                            }
                            
                            if (patternMatches.length > 0) {
                              matches.push({ pattern, matches: patternMatches });
                            }
                          }
                        }
                        
                        setPatternTestResult({ totalMatches, matches });
                      } finally {
                        setTestingPatterns(false);
                      }
                    }}
                    loading={testingPatterns}
                  >
                    Test Patterns
                  </Button>
                  
                  {patternTestResult && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium mb-2">
                        Found {patternTestResult.totalMatches} matches
                      </h4>
                      {patternTestResult.matches.map((match, idx) => (
                        <div key={idx} className="mb-2">
                          <span className="font-medium">{match.pattern.name}:</span>
                          <ul className="ml-4 text-sm">
                            {match.matches.map((m, midx) => (
                              <li key={midx}>&quot;{m.text}&quot; at position {m.start}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Panel>
            </div>
          )}

          {/* Health Tab */}
          {activeTab === 'health' && (
            <div className="space-y-6">
              <Panel 
                title="System Health" 
                description="Demonstrates utilityAPI health check methods"
                action={
                  <div className="flex gap-3">
                    <Button 
                      variant="primary" 
                      size="sm"
                      onClick={() => healthCheck.execute()}
                      loading={healthCheck.loading}
                    >
                      Check Health
                    </Button>
                    <Button 
                      variant="secondary" 
                      size="sm"
                      onClick={() => dashboardStats.execute()}
                      loading={dashboardStats.loading}
                    >
                      Get Stats
                    </Button>
                  </div>
                }
              >
                {healthCheck.data && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${
                        healthCheck.data.status === 'healthy' ? 'bg-green-500' : 'bg-red-500'
                      }`} />
                      <span className="font-medium">
                        Status: {healthCheck.data.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Database:</span>{' '}
                        {healthCheck.data.database.connected ? 'Connected' : 'Disconnected'}
                      </div>
                      <div>
                        <span className="font-medium">Type:</span>{' '}
                        {healthCheck.data.database.type}
                      </div>
                    </div>
                  </div>
                )}
              </Panel>

              {dashboardStats.data && (
                <Panel title="Dashboard Statistics">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {dashboardStats.data.dataSources.total}
                      </div>
                      <div className="text-sm text-gray-600">Data Sources</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {dashboardStats.data.patterns.total}
                      </div>
                      <div className="text-sm text-gray-600">Patterns</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">
                        {dashboardStats.data.syntheticData.totalDatasets}
                      </div>
                      <div className="text-sm text-gray-600">Synthetic Datasets</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {dashboardStats.data.pipelines.total}
                      </div>
                      <div className="text-sm text-gray-600">Pipelines</div>
                    </div>
                  </div>
                </Panel>
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}