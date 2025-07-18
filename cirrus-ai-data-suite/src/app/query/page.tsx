'use client';

import React, { useState, useRef, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { 
  MagnifyingGlassIcon, 
  SparklesIcon,
  ClockIcon,
  BookmarkIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  TableCellsIcon,
  CodeBracketIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  PlusCircleIcon,
  FolderPlusIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { BookmarkIcon as BookmarkSolidIcon } from '@heroicons/react/24/solid';
import { useRouter } from 'next/navigation';
import { HelpButton } from '@/components/HelpSystem';
import { getHelpContent } from '@/content/helpContent';

interface QueryResult {
  id: string;
  query: string;
  answer: string;
  sources: Array<{
    type: 'data_source' | 'table' | 'field' | 'pattern';
    name: string;
    id: string;
  }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  timestamp: Date;
  // Development only - generated query/code
  generatedQuery?: {
    type: 'analysis' | 'code';
    sources: string[];
    code?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    operations?: any[];
  };
}

interface QueryHistoryItem {
  id: string;
  query: string;
  timestamp: Date;
  isSaved?: boolean;
}

type ResultView = 'text' | 'table' | 'json';

export default function QueryPage() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentResult, setCurrentResult] = useState<QueryResult | null>(null);
  const [history, setHistory] = useState<QueryHistoryItem[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [resultView, setResultView] = useState<ResultView>('text');
  const [savingData, setSavingData] = useState(false);
  const [explainMethodology, setExplainMethodology] = useState(false);
  const [showGeneratedQuery, setShowGeneratedQuery] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  useEffect(() => {
    loadHistory();
    loadSuggestions();
  }, []);

  const loadHistory = async () => {
    try {
      const response = await fetch('/api/query/history');
      if (response.ok) {
        const data = await response.json();
        setHistory(data.history);
      }
    } catch (error) {
      console.error('Failed to load query history:', error);
    }
  };

  const loadSuggestions = async () => {
    try {
      const response = await fetch('/api/query/suggestions');
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions);
      }
    } catch (error) {
      console.error('Failed to load suggestions:', error);
    }
  };

  const executeQuery = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setShowSuggestions(false); // Hide suggestions when executing
    
    try {
      const response = await fetch('/api/query/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, explainMethodology })
      });

      if (response.ok) {
        const result = await response.json();
        setCurrentResult(result);
        
        // Add to history
        const historyItem: QueryHistoryItem = {
          id: result.id,
          query: query,
          timestamp: new Date()
        };
        setHistory(prev => [historyItem, ...prev.slice(0, 19)]);
        
        // Clear the query input
        setQuery('');
      } else {
        const error = await response.json();
        console.error('Query failed:', error);
        // TODO: Show error to user
      }
    } catch (error) {
      console.error('Failed to execute query:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      executeQuery();
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const loadHistoryItem = (item: QueryHistoryItem) => {
    setQuery(item.query);
    inputRef.current?.focus();
  };

  const toggleSaveQuery = async (item: QueryHistoryItem) => {
    try {
      const response = await fetch('/api/query/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          queryId: item.id,
          action: item.isSaved ? 'unsave' : 'save'
        })
      });

      if (response.ok) {
        setHistory(prev => prev.map(h => 
          h.id === item.id ? { ...h, isSaved: !h.isSaved } : h
        ));
      }
    } catch (error) {
      console.error('Failed to save query:', error);
    }
  };

  const downloadResults = () => {
    if (!currentResult?.data) return;

    const blob = new Blob([JSON.stringify(currentResult.data, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query-results-${currentResult.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const viewSource = (source: { type: string; id: string }) => {
    // Navigate to the appropriate page based on source type
    switch (source.type) {
      case 'data_source':
        router.push(`/discovery?highlight=${source.id}`);
        break;
      case 'table':
        // Extract data source ID from table source if needed
        router.push(`/discovery`);
        break;
      case 'field':
        router.push(`/catalog?field=${source.id}`);
        break;
      case 'pattern':
        router.push(`/redaction?pattern=${source.id}`);
        break;
    }
  };

  const createDataAssembly = async () => {
    if (!currentResult?.sources || currentResult.sources.length === 0) return;

    try {
      setSavingData(true);
      // Create a new session with the data sources
      const dataSourceIds = currentResult.sources
        .filter(s => s.type === 'data_source')
        .map(s => s.id);

      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Query Results - ${new Date().toLocaleDateString()}`,
          description: `Data assembly created from query: "${currentResult.query}"`,
          dataSourceIds
        })
      });

      if (response.ok) {
        const session = await response.json();
        router.push(`/assembly?session=${session.id}`);
      }
    } catch (error) {
      console.error('Failed to create data assembly:', error);
    } finally {
      setSavingData(false);
    }
  };

  const saveAsDataSource = async () => {
    if (!currentResult?.data) return;

    try {
      setSavingData(true);
      const response = await fetch('/api/data-sources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Query Results - ${new Date().toLocaleDateString()}`,
          type: 'json_transformed',
          description: `Created from query: "${currentResult.query}"`,
          configuration: {
            content: JSON.stringify(currentResult.data),
            contentType: 'application/json'
          }
        })
      });

      if (response.ok) {
        const dataSource = await response.json();
        router.push(`/discovery?highlight=${dataSource.id}`);
      }
    } catch (error) {
      console.error('Failed to save as data source:', error);
    } finally {
      setSavingData(false);
    }
  };

  const renderFormattedAnswer = (answer: string) => {
    // Check if the answer contains a table (common patterns)
    const hasTable = answer.includes('|') && answer.includes('---');
    
    if (hasTable) {
      // Parse markdown-style table
      const lines = answer.split('\n');
      const tableLines: string[] = [];
      const beforeTable: string[] = [];
      const afterTable: string[] = [];
      let inTable = false;
      let tableEnded = false;
      
      for (const line of lines) {
        if (line.includes('|') && !tableEnded) {
          inTable = true;
          tableLines.push(line);
        } else if (inTable && !line.trim()) {
          tableEnded = true;
          afterTable.push(line);
        } else if (tableEnded || !inTable) {
          if (tableEnded) {
            afterTable.push(line);
          } else {
            beforeTable.push(line);
          }
        }
      }
      
      if (tableLines.length > 0) {
        // Parse the table
        const headers = tableLines[0].split('|').map(h => h.trim()).filter(h => h);
        const dataRows = tableLines.slice(2).map(row => 
          row.split('|').map(cell => cell.trim()).filter(cell => cell !== '')
        );
        
        return (
          <>
            {beforeTable.length > 0 && (
              <div className="whitespace-pre-wrap mb-4">{beforeTable.join('\n')}</div>
            )}
            <div className="my-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden">
                <thead className="bg-gray-50">
                  <tr>
                    {headers.map((header, idx) => (
                      <th key={idx} className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {dataRows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-gray-50">
                      {row.map((cell, cellIdx) => (
                        <td key={cellIdx} className="px-4 py-2 text-sm text-gray-900">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {afterTable.length > 0 && (
              <div className="whitespace-pre-wrap mt-4">{afterTable.join('\n')}</div>
            )}
          </>
        );
      }
    }
    
    // For non-table content, just render as before
    return <div className="whitespace-pre-wrap">{answer}</div>;
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar - Query History */}
        <div className="w-80 bg-gray-50 border-r border-gray-200 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <ClockIcon className="h-4 w-4" />
              Query History
            </h3>
            <div className="space-y-2">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="group p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      onClick={() => loadHistoryItem(item)}
                      className="flex-1 text-left"
                    >
                      <p className="text-sm text-gray-900 line-clamp-2">
                        {item.query}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(item.timestamp).toLocaleString()}
                      </p>
                    </button>
                    <button
                      onClick={() => toggleSaveQuery(item)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      {item.isSaved ? (
                        <BookmarkSolidIcon className="h-4 w-4 text-blue-600" />
                      ) : (
                        <BookmarkIcon className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Query Input */}
          <div className="border-b border-gray-200 p-6">
            <div className="max-w-4xl mx-auto">
              <div className="mb-3 flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={explainMethodology}
                    onChange={(e) => setExplainMethodology(e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Explain Methodology
                </label>
                <HelpButton content={getHelpContent('query')} />
              </div>
              <div className="relative">
                <textarea
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="Ask a question about your data..."
                  className="w-full px-4 py-3 pr-12 text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={3}
                />
                <button
                  onClick={executeQuery}
                  disabled={loading || !query.trim()}
                  className="absolute right-3 bottom-3 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  ) : (
                    <SparklesIcon className="h-5 w-5" />
                  )}
                </button>

                {/* Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200">
                    <div className="p-2">
                      <p className="text-xs text-gray-500 font-medium px-2 py-1">
                        Suggested queries
                      </p>
                      {suggestions.slice(0, 5).map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setQuery(suggestion);
                            setShowSuggestions(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Results Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {currentResult ? (
              <div className="max-w-4xl mx-auto">
                {/* Result Header */}
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Query Results
                  </h2>
                  <div className="flex items-center gap-2">
                    {/* View Toggle */}
                    <div className="flex items-center bg-gray-100 rounded-lg p-1">
                      <button
                        onClick={() => setResultView('text')}
                        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                          resultView === 'text'
                            ? 'bg-white text-gray-900 shadow-sm'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        <DocumentTextIcon className="h-4 w-4" />
                      </button>
                      {currentResult.data && (
                        <>
                          <button
                            onClick={() => setResultView('table')}
                            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                              resultView === 'table'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            <TableCellsIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setResultView('json')}
                            className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                              resultView === 'json'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900'
                            }`}
                          >
                            <CodeBracketIcon className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                    {currentResult.data && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={saveAsDataSource}
                          disabled={savingData}
                          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                          <PlusCircleIcon className="h-4 w-4" />
                          Save as Data Source
                        </button>
                        <button
                          onClick={downloadResults}
                          className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-1"
                        >
                          <ArrowDownTrayIcon className="h-4 w-4" />
                          Download
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Result Content */}
                {resultView === 'text' && (
                  <div className="prose prose-gray max-w-none">
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      <div className="text-gray-900">
                        {renderFormattedAnswer(currentResult.answer)}
                      </div>
                      
                      {/* Sources */}
                      {currentResult.sources.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-gray-200">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-gray-900">
                              Sources Referenced
                            </h4>
                            {currentResult.sources.length > 1 && (
                              <button
                                onClick={createDataAssembly}
                                disabled={savingData}
                                className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                <FolderPlusIcon className="h-4 w-4" />
                                Create Data Assembly
                              </button>
                            )}
                          </div>
                          <div className="space-y-2">
                            {currentResult.sources.map((source, index) => (
                              <div key={index} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                                <div className="text-sm text-gray-600">
                                  <span className="capitalize">{source.type.replace('_', ' ')}:</span>{' '}
                                  <span className="font-medium text-gray-900">{source.name}</span>
                                </div>
                                <button
                                  onClick={() => viewSource(source)}
                                  className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:text-blue-700 border border-blue-300 rounded hover:bg-blue-50"
                                >
                                  <EyeIcon className="h-3 w-3" />
                                  View
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {resultView === 'table' && currentResult.data && (
                  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            {Object.keys(currentResult.data[0] || {}).map((key) => (
                              <th
                                key={key}
                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                              >
                                {key}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                          {currentResult.data.slice(0, 50).map((row: any, index: number) => (
                            <tr key={index}>
                              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                              {Object.values(row).map((value: any, i: number) => (
                                <td key={i} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {String(value)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {currentResult.data.length > 50 && (
                      <div className="px-6 py-3 bg-gray-50 text-sm text-gray-600">
                        Showing first 50 of {currentResult.data.length} rows
                      </div>
                    )}
                  </div>
                )}

                {resultView === 'json' && currentResult.data && (
                  <div className="bg-gray-900 rounded-lg p-6 overflow-x-auto">
                    <pre className="text-sm text-gray-100">
                      <code>{JSON.stringify(currentResult.data, null, 2)}</code>
                    </pre>
                  </div>
                )}

                {/* Show Generated Query/Code - Collapsible */}
                {currentResult.generatedQuery && (
                  <div className="mt-6">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg">
                      <button
                        onClick={() => setShowGeneratedQuery(!showGeneratedQuery)}
                        className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-100 transition-colors"
                      >
                        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                          <CodeBracketIcon className="h-4 w-4" />
                          View Generated {currentResult.generatedQuery.type === 'code' ? 'Code' : 'Query'}
                        </h3>
                        {showGeneratedQuery ? (
                          <ChevronDownIcon className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronRightIcon className="h-4 w-4 text-gray-500" />
                        )}
                      </button>
                      
                      {showGeneratedQuery && (
                        <div className="p-4 pt-0">
                          {currentResult.generatedQuery.type === 'code' && currentResult.generatedQuery.code ? (
                            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                              <pre className="text-sm text-gray-100">
                                <code className="language-javascript">{currentResult.generatedQuery.code}</code>
                              </pre>
                            </div>
                          ) : (
                            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
                              <pre className="text-sm text-gray-100">
                                <code>{JSON.stringify(currentResult.generatedQuery, null, 2)}</code>
                              </pre>
                            </div>
                          )}

                          <div className="mt-3 text-xs text-gray-600">
                            <p>Type: <span className="font-medium">{currentResult.generatedQuery.type}</span></p>
                            <p>Sources: <span className="font-medium">{currentResult.generatedQuery.sources.join(', ')}</span></p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="max-w-4xl mx-auto text-center py-12">
                <MagnifyingGlassIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Ask a question about your data
                </h3>
                <p className="text-gray-600 mb-6">
                  Use natural language to explore and analyze your data sources, patterns, and metadata.
                </p>
                <div className="text-left bg-gray-50 rounded-lg p-6">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">
                    Example queries:
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• What personal information do we have about customers?</li>
                    <li>• Show me all data sources containing email addresses</li>
                    <li>• Which tables have the most PII fields?</li>
                    <li>• List all API endpoints and their refresh schedules</li>
                    <li>• What patterns are defined for financial data?</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}