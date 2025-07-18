'use client';

import React, { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import ProfileTableView from '@/components/profiling/ProfileTableView';
import { DataProfilingViewerInline } from '@/components/DataProfilingViewer/InlineWrapper';
import { QualityRulesTab } from '@/components/qualityRules/QualityRulesTab';
import { Search, Database, BarChart3, FileText, RefreshCw, AlertCircle, Settings, Download, Info } from 'lucide-react';

// Consistent quality metric color scheme
const getQualityMetricColor = (value: number): string => {
  if (value >= 90) return 'text-green-600';
  if (value >= 70) return 'text-yellow-600';
  if (value >= 50) return 'text-orange-600';
  return 'text-red-600';
};

const getQualityMetricBgColor = (value: number): string => {
  if (value >= 90) return 'bg-green-50';
  if (value >= 70) return 'bg-yellow-50';
  if (value >= 50) return 'bg-orange-50';
  return 'bg-red-50';
};

interface DataSource {
  id: string;
  name: string;
  sourceType: string;
  status: string;
  recordCount?: number;
  fieldCount?: number;
  transformedData?: string;
  hasTransformedData?: boolean;
  transformedAt?: string;
}

export default function QualityPage() {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [selectedDataSource, setSelectedDataSource] = useState<DataSource | null>(null);
  const [viewMode, setViewMode] = useState<'basic' | 'enhanced' | 'rules'>('basic');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [qualityMetrics, setQualityMetrics] = useState<{
    completeness: number;
    uniqueness: number;
    validity: number;
    consistency: number;
  } | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [showEnhancedSettings, setShowEnhancedSettings] = useState(false);
  // Enhanced profile configuration state
  const [enhancedConfig, setEnhancedConfig] = useState({
    sampleSize: 100,
    outlierMethod: 'IQR' as 'IQR' | 'Z-Score' | 'Modified-Z-Score',
    distributionBins: 10,
    showSummary: false,
    showOutliers: false,
    showDistributions: false
  });
  const [availableFields, setAvailableFields] = useState<string[]>([]);

  useEffect(() => {
    fetchDataSources();
  }, []);

  const fetchDataSources = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/data-sources?t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        console.log('=== ALL FETCHED DATA SOURCES ===');
        console.log('Total sources:', data.length);
        
        // Debug: Log all sources to see what we have
        data.forEach((source: DataSource, index: number) => {
          console.log(`Source ${index + 1}:`, {
            name: source.name,
            sourceType: source.sourceType,
            status: source.status,
            hasTransformedData: source.hasTransformedData,
            hasTransformedDataType: typeof source.hasTransformedData,
            transformedDataExists: !!source.transformedData,
            transformedDataLength: source.transformedData?.length || 0,
            transformedAt: source.transformedAt
          });
        });
        
        // Initially show ALL data sources to debug
        console.log('=== SHOWING ALL SOURCES FOR DEBUGGING ===');
        setDataSources(data);
        
        // // More lenient filtering - just check if transformedData exists and isn't empty
        // const transformedSources = data.filter((source: DataSource) => {
        //   const hasTransformedData = source.transformedData && 
        //                            source.transformedData.length > 0 &&
        //                            source.transformedData !== '[]' && 
        //                            source.transformedData !== 'null' &&
        //                            source.transformedData.trim() !== '';
        //   
        //   console.log(`${source.name}: hasTransformedData = ${hasTransformedData}`);
        //   return hasTransformedData;
        // });
        // 
        // console.log('Filtered transformed sources:', transformedSources.length);
        // setDataSources(transformedSources);
      } else {
        throw new Error(`Failed to fetch data sources: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error fetching data sources:', error);
      setError(error instanceof Error ? error.message : 'Failed to load data sources');
    } finally {
      setLoading(false);
    }
  };

  // Real-time filtering
  const filteredDataSources = dataSources.filter(source => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (source.name || '').toLowerCase().includes(term) ||
           (source.sourceType || '').toLowerCase().includes(term) ||
           (source.status || '').toLowerCase().includes(term);
  });

  // Get search suggestions
  const getSearchSuggestions = () => {
    if (!searchTerm.trim() || searchTerm.length < 2) return [];
    
    const suggestions = new Set<string>();
    const term = searchTerm.toLowerCase();
    
    dataSources.forEach(source => {
      // Add matching names
      if (source.name && source.name.toLowerCase().includes(term)) {
        suggestions.add(source.name);
      }
      // Add matching types
      if (source.sourceType && source.sourceType.toLowerCase().includes(term)) {
        suggestions.add(source.sourceType);
      }
    });
    
    return Array.from(suggestions).slice(0, 5);
  };

  const searchSuggestions = getSearchSuggestions();

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setShowSuggestions(value.length >= 2);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setSearchTerm(suggestion);
    setShowSuggestions(false);
  };

  const fetchAvailableFields = async (dataSourceId: string): Promise<string[]> => {
    try {
      const response = await fetch(`/api/data-sources/${dataSourceId}/transform?pageSize=1`);
      if (response.ok) {
        const catalog = await response.json();
        if (catalog.schema && catalog.schema.fields) {
          return catalog.schema.fields.map((field: { name?: string; field?: string } | string) => 
            typeof field === 'string' ? field : (field.name || field.field || String(field)));
        }
      }
    } catch (error) {
      console.error('Error fetching available fields:', error);
    }
    return [];
  };

  const handleDataSourceSelect = async (dataSource: DataSource) => {
    setSelectedDataSource(dataSource);
    setViewMode('basic'); // Default to basic view
    
    // Fetch quality metrics immediately
    setMetricsLoading(true);
    setQualityMetrics(null);
    
    // Fetch available fields for rules engine
    const fields = await fetchAvailableFields(dataSource.id);
    setAvailableFields(fields);
    console.log(`Fetched ${fields.length} available fields for rules engine:`, fields);
    
    try {
      // Fetch the basic profile to get quality metrics
      const response = await fetch(`/api/data-sources/${dataSource.id}/profile`);
      if (response.ok) {
        const profile = await response.json();
        console.log('Profile response:', profile);
        
        // Extract quality metrics from the profile
        if (profile.qualityMetrics) {
          setQualityMetrics({
            completeness: profile.qualityMetrics.completeness * 100,
            uniqueness: profile.qualityMetrics.uniqueness * 100,
            validity: profile.qualityMetrics.validity * 100,
            consistency: profile.qualityMetrics.consistency * 100
          });
        }
        
        // Get field count from the profile
        if (profile.fields && profile.fields.length > 0) {
          const updatedDataSource = { ...dataSource, fieldCount: profile.fields.length };
          setSelectedDataSource(updatedDataSource);
          console.log(`Updated field count from profile: ${profile.fields.length} fields`);
        } else if (profile.fieldCount) {
          // Sometimes the field count is directly in the profile
          const updatedDataSource = { ...dataSource, fieldCount: profile.fieldCount };
          setSelectedDataSource(updatedDataSource);
          console.log(`Updated field count from profile.fieldCount: ${profile.fieldCount} fields`);
        }
      } else {
        console.log('Profile API failed, trying transform API to get field count...');
        // Fallback: Try the transform API to get field count
        const transformResponse = await fetch(`/api/data-sources/${dataSource.id}/transform?pageSize=1`);
        if (transformResponse.ok) {
          const catalog = await transformResponse.json();
          console.log('Transform response for field count:', catalog);
          
          if (catalog.schema && catalog.schema.fields) {
            const fieldCount = catalog.schema.fields.length;
            const updatedDataSource = { ...dataSource, fieldCount };
            setSelectedDataSource(updatedDataSource);
            console.log(`Updated field count from transform API: ${fieldCount} fields`);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching quality metrics:', error);
      
      // Final fallback: Try transform API for field count only
      try {
        console.log('Final fallback: trying transform API for field count...');
        const transformResponse = await fetch(`/api/data-sources/${dataSource.id}/transform?pageSize=1`);
        if (transformResponse.ok) {
          const catalog = await transformResponse.json();
          console.log('Fallback transform response:', catalog);
          
          if (catalog.schema && catalog.schema.fields) {
            const fieldCount = catalog.schema.fields.length;
            const updatedDataSource = { ...dataSource, fieldCount };
            setSelectedDataSource(updatedDataSource);
            console.log(`Updated field count from fallback transform API: ${fieldCount} fields`);
          }
        }
      } catch (fallbackError) {
        console.error('Fallback transform API also failed:', fallbackError);
      }
    } finally {
      setMetricsLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                Data Quality Assessment
              </h1>
              <p className="text-gray-600">
                Analyze data quality metrics, view statistical distributions, and assess completeness, uniqueness, validity, and consistency.
              </p>
            </div>
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <RefreshCw className="mx-auto h-8 w-8 text-gray-400 animate-spin mb-4" />
                <div className="text-gray-600">Loading data sources...</div>
              </div>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                  Data Quality Assessment
                </h1>
                <p className="text-gray-600">
                  Analyze data quality metrics, view statistical distributions, and assess completeness, uniqueness, validity, and consistency.
                </p>
              </div>
              
              {!selectedDataSource && (
                <button
                  onClick={fetchDataSources}
                  disabled={loading}
                  className="flex items-center px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              )}
            </div>

            {/* Error Alert */}
            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                  <div>
                    <h3 className="text-sm font-medium text-red-800">Error Loading Data Sources</h3>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                  <button
                    onClick={fetchDataSources}
                    className="ml-auto px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}
          </div>

          {!selectedDataSource ? (
            /* Data Source Selection */
            <div className="bg-white rounded-lg shadow-md">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  Select Data Source for Quality Analysis
                </h2>
                
                {/* Search with Autocomplete */}
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Type to search data sources..."
                    value={searchTerm}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onFocus={() => searchTerm.length >= 2 && setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  
                  {/* Clear search button */}
                  {searchTerm && (
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setShowSuggestions(false);
                      }}
                      className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  )}
                  
                  {/* Search Suggestions Dropdown */}
                  {showSuggestions && searchSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                      {searchSuggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                        >
                          <Search className="inline w-3 h-3 mr-2 text-gray-400" />
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6">
                {/* Summary Stats */}
                {dataSources.length > 0 && (
                  <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      Found {filteredDataSources.length} of {dataSources.length} data sources available for quality analysis
                      {searchTerm && ` matching "${searchTerm}"`}
                    </p>
                  </div>
                )}

                {filteredDataSources.length === 0 ? (
                  <div className="text-center py-12">
                    <Database className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {dataSources.length === 0 ? 'No Data Sources Available' : 'No Matching Results'}
                    </h3>
                    <p className="text-gray-600 mb-4">
                      {dataSources.length === 0 
                        ? 'No transformed data sources are available for quality analysis.'
                        : `No data sources match your search for "${searchTerm}".`
                      }
                    </p>
                    {dataSources.length === 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm text-gray-500">
                          To get started with quality analysis:
                        </p>
                        <ol className="text-sm text-gray-600 space-y-1 max-w-md mx-auto">
                          <li>1. Go to the Discovery page</li>
                          <li>2. Upload your data files</li>
                          <li>3. Transform them to JSON format</li>
                          <li>4. Return here for quality analysis</li>
                        </ol>
                        <button
                          onClick={() => window.location.href = '/discovery'}
                          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          Go to Discovery →
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        Clear Search
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredDataSources.map((source) => {
                      // Get record count
                      const recordCount = source.recordCount;
                      const fieldCount = 0;
                      const isTransformed = !!source.transformedData;
                      
                      // For now, we'll get the field count from the profile API
                      // This will be populated when the data source is selected
                      
                      // Add field count to the source object
                      const sourceWithFieldCount = { ...source, fieldCount };

                      return (
                        <div
                          key={source.id}
                          onClick={() => handleDataSourceSelect(sourceWithFieldCount)}
                          className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:border-blue-500 hover:shadow-md cursor-pointer transition-all group"
                        >
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              <div className="flex-shrink-0">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                  <Database className="w-5 h-5 text-blue-600" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors truncate">
                                  {source.name}
                                </h3>
                                <p className="text-sm text-gray-500 truncate">
                                  {source.sourceType}
                                </p>
                              </div>
                            </div>
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              source.status === 'completed' 
                                ? 'bg-green-100 text-green-800'
                                : source.status === 'processing'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {source.status}
                            </span>
                          </div>
                          
                          <div className="space-y-3">
                            {recordCount && (
                              <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Records</span>
                                <span className="font-medium text-gray-900">{recordCount.toLocaleString()}</span>
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-500">Data Status</span>
                              <span className={`font-medium ${isTransformed ? 'text-green-600' : 'text-gray-400'}`}>
                                {isTransformed ? 'Transformed' : 'Raw'}
                              </span>
                            </div>
                            
                            <div className="pt-2 border-t border-gray-100">
                              <div className="flex items-center justify-between text-xs text-gray-500">
                                <span>Ready for quality analysis</span>
                                <span className="group-hover:text-blue-600 transition-colors">
                                  Analyze →
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Quality Analysis Views */
            <div className="space-y-6">
              {/* Data Source Info & View Controls */}
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {selectedDataSource.name}
                    </h2>
                    <p className="text-gray-600">
                      {selectedDataSource.sourceType || 'Unknown'} • {selectedDataSource.recordCount?.toLocaleString()} total records • {selectedDataSource.fieldCount || 0} fields
                    </p>
                  </div>
                  
                  <button
                    onClick={() => {
                      setSelectedDataSource(null);
                      setViewMode('basic');
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    ← Back to Selection
                  </button>
                </div>

                {/* Overall Quality Metrics */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-700 mb-3">Overall Data Quality</h3>
                  {metricsLoading ? (
                    <div className="flex items-center justify-center h-24">
                      <RefreshCw className="w-5 h-5 text-gray-400 animate-spin" />
                      <span className="ml-2 text-sm text-gray-500">Calculating quality metrics...</span>
                    </div>
                  ) : qualityMetrics ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className={`text-center p-3 rounded-lg ${getQualityMetricBgColor(qualityMetrics.completeness)}`}>
                        <div className={`text-2xl font-bold ${getQualityMetricColor(qualityMetrics.completeness)}`}>
                          {qualityMetrics.completeness.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-600 mt-1">Completeness</div>
                      </div>
                      <div className={`text-center p-3 rounded-lg ${getQualityMetricBgColor(qualityMetrics.uniqueness)}`}>
                        <div className={`text-2xl font-bold ${getQualityMetricColor(qualityMetrics.uniqueness)}`}>
                          {qualityMetrics.uniqueness.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-600 mt-1">Uniqueness</div>
                      </div>
                      <div className={`text-center p-3 rounded-lg ${getQualityMetricBgColor(qualityMetrics.validity)}`}>
                        <div className={`text-2xl font-bold ${getQualityMetricColor(qualityMetrics.validity)}`}>
                          {qualityMetrics.validity.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-600 mt-1">Validity</div>
                      </div>
                      <div className={`text-center p-3 rounded-lg ${getQualityMetricBgColor(qualityMetrics.consistency)}`}>
                        <div className={`text-2xl font-bold ${getQualityMetricColor(qualityMetrics.consistency)}`}>
                          {qualityMetrics.consistency.toFixed(1)}%
                        </div>
                        <div className="text-xs text-gray-600 mt-1">Consistency</div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-900">--</div>
                        <div className="text-xs text-gray-600 mt-1">Completeness</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-900">--</div>
                        <div className="text-xs text-gray-600 mt-1">Uniqueness</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-900">--</div>
                        <div className="text-xs text-gray-600 mt-1">Validity</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-900">--</div>
                        <div className="text-xs text-gray-600 mt-1">Consistency</div>
                      </div>
                    </div>
                  )}
                  {qualityMetrics && (
                    <p className="text-xs text-gray-500 text-center mt-2">
                      Quality metrics calculated from all {selectedDataSource.recordCount?.toLocaleString()} records
                    </p>
                  )}
                </div>

                {/* View Mode Toggle with Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setViewMode('basic')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        viewMode === 'basic'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      <BarChart3 className="inline w-4 h-4 mr-2" />
                      Basic Profile
                    </button>
                    <button
                      onClick={() => setViewMode('enhanced')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        viewMode === 'enhanced'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      <FileText className="inline w-4 h-4 mr-2" />
                      Enhanced View
                    </button>
                    <button
                      onClick={() => setViewMode('rules')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                        viewMode === 'rules'
                          ? 'bg-white text-blue-600 shadow-sm'
                          : 'text-gray-600 hover:text-gray-800'
                      }`}
                    >
                      <Settings className="inline w-4 h-4 mr-2" />
                      Quality Rules
                    </button>
                  </div>
                  
                  {/* Action buttons - always visible */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowEnhancedSettings(!showEnhancedSettings)}
                      className={`flex items-center px-3 py-2 text-sm border rounded-lg transition-colors ${
                        showEnhancedSettings 
                          ? 'bg-blue-50 text-blue-700 border-blue-300' 
                          : 'text-gray-600 hover:text-gray-800 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <Settings className="w-4 h-4 mr-1" />
                      Config
                    </button>
                    
                    <button className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                      <Download className="w-4 h-4 mr-1" />
                      Export
                    </button>
                    
                    <button className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                      <Info className="w-4 h-4 mr-1" />
                      Help
                    </button>
                  </div>
                </div>

                {/* Enhanced Configuration Panel - always below tabs */}
                {showEnhancedSettings && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Enhanced Profile Configuration</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Sample Size</label>
                        <select
                          value={enhancedConfig.sampleSize}
                          onChange={(e) => setEnhancedConfig(prev => ({ ...prev, sampleSize: parseInt(e.target.value) }))}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value={100}>100 records</option>
                          <option value={500}>500 records</option>
                          <option value={1000}>1,000 records</option>
                          <option value={5000}>5,000 records</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Outlier Detection</label>
                        <select
                          value={enhancedConfig.outlierMethod}
                          onChange={(e) => setEnhancedConfig(prev => ({ ...prev, outlierMethod: e.target.value as 'IQR' | 'Z-Score' | 'Modified-Z-Score' }))}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="IQR">IQR (Interquartile Range)</option>
                          <option value="Z-Score">Z-Score Method</option>
                          <option value="Modified-Z-Score">Modified Z-Score</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Distribution Bins</label>
                        <select
                          value={enhancedConfig.distributionBins}
                          onChange={(e) => setEnhancedConfig(prev => ({ ...prev, distributionBins: parseInt(e.target.value) }))}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value={5}>5 bins</option>
                          <option value={10}>10 bins</option>
                          <option value={20}>20 bins</option>
                          <option value={50}>50 bins</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex items-center space-x-6">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={enhancedConfig.showSummary}
                          onChange={(e) => setEnhancedConfig(prev => ({ ...prev, showSummary: e.target.checked }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Summary Statistics</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={enhancedConfig.showOutliers}
                          onChange={(e) => setEnhancedConfig(prev => ({ ...prev, showOutliers: e.target.checked }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Outlier Analysis</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={enhancedConfig.showDistributions}
                          onChange={(e) => setEnhancedConfig(prev => ({ ...prev, showDistributions: e.target.checked }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm text-gray-700">Distribution Charts</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Content Views */}
              {viewMode === 'basic' && (
                <DataProfilingViewerInline sourceId={selectedDataSource.id} />
              )}

              {viewMode === 'enhanced' && (
                <ProfileTableView 
                  dataSourceId={selectedDataSource.id}
                  dataSourceName={selectedDataSource.name}
                  config={enhancedConfig}
                />
              )}

              {viewMode === 'rules' && (
                <QualityRulesTab
                  dataSourceId={selectedDataSource.id}
                  dataSourceName={selectedDataSource.name}
                  availableFields={availableFields}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}