'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Play, Upload, AlertCircle, Database } from 'lucide-react';
import Editor, { Monaco } from '@monaco-editor/react';
import AppLayout from '@/components/AppLayout';
import { DatabaseConnection, DatabaseSchema } from '@/types/connector';
import type { editor } from 'monaco-editor';

interface QueryResult {
  columns: string[];
  rows: unknown[][];
  rowCount: number;
  executionTime?: number;
}

export default function QueryImportPage() {
  const params = useParams();
  const router = useRouter();
  const connectionId = params?.id as string;

  const [connection, setConnection] = useState<DatabaseConnection | null>(null);
  const [schema, setSchema] = useState<DatabaseSchema | null>(null);
  const [query, setQuery] = useState('SELECT * FROM ');
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importName, setImportName] = useState('');
  const [importDescription, setImportDescription] = useState('');
  const monacoRef = useRef<Monaco | null>(null);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const completionProviderRef = useRef<any | null>(null);

  useEffect(() => {
    fetchConnection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connectionId]);

  useEffect(() => {
    if (connection) {
      fetchSchema();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection]);

  // Setup completion provider when both monaco and schema are ready
  useEffect(() => {
    if (monacoRef.current && schema) {
      // Dispose of any existing completion provider
      if (completionProviderRef.current) {
        completionProviderRef.current.dispose();
      }

      // Register new completion provider
      completionProviderRef.current = monacoRef.current.languages.registerCompletionItemProvider('sql', {
        triggerCharacters: [' ', '.'],
        provideCompletionItems: (model, position) => {
          const textUntilPosition = model.getValueInRange({
            startLineNumber: 1,
            startColumn: 1,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
          });

          const word = model.getWordUntilPosition(position);
          const range = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };
          
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const suggestions: any[] = [];
          
          // Add SQL keywords first
          const keywords = [
            'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT', 'RIGHT', 'INNER', 'OUTER',
            'ON', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'ORDER', 'BY',
            'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'AS', 'DISTINCT', 'COUNT',
            'SUM', 'AVG', 'MIN', 'MAX', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END'
          ];
          
          keywords.forEach(keyword => {
            suggestions.push({
              label: keyword,
              kind: monacoRef.current!.languages.CompletionItemKind.Keyword,
              insertText: keyword,
              range: range
            });
          });
          
          // Add table names
          schema.tables.forEach(table => {
            suggestions.push({
              label: table.name,
              kind: monacoRef.current!.languages.CompletionItemKind.Class,
              insertText: table.name,
              detail: `Table (${table.rowCount} rows)`,
              range: range
            });
          });

          // Check if we're after a table name and a dot
          const tableMatch = textUntilPosition.match(/(\w+)\.$/);
          if (tableMatch) {
            const tableName = tableMatch[1];
            const table = schema.tables.find(t => t.name === tableName);
            if (table) {
              // Clear suggestions to only show columns
              suggestions.length = 0;
              
              // Add column suggestions for this table
              table.columns.forEach(column => {
                suggestions.push({
                  label: column.name,
                  kind: monacoRef.current!.languages.CompletionItemKind.Field,
                  insertText: column.name,
                  detail: `${column.dataType}${column.nullable ? ' (nullable)' : ''}`,
                  range: range
                });
              });
            }
          }

          return { suggestions };
        },
      });
    }

    // Cleanup on unmount
    return () => {
      if (completionProviderRef.current) {
        completionProviderRef.current.dispose();
      }
    };
  }, [schema]);

  const fetchConnection = async () => {
    try {
      const response = await fetch(`/api/database-connections/${connectionId}`);
      if (!response.ok) throw new Error('Failed to fetch connection');
      const data = await response.json();
      setConnection(data);
    } catch (err) {
      console.error('Error fetching connection:', err);
      setError('Failed to load database connection');
    }
  };

  const fetchSchema = async () => {
    try {
      const response = await fetch(`/api/database-connections/${connectionId}/schema`);
      if (!response.ok) throw new Error('Failed to fetch schema');
      const data = await response.json();
      setSchema(data);
    } catch (err) {
      console.error('Error fetching schema:', err);
    }
  };

  const executeQuery = async () => {
    if (!query.trim()) {
      setError('Please enter a query');
      return;
    }

    setIsExecuting(true);
    setError(null);
    setQueryResult(null);

    try {
      const response = await fetch(`/api/database-connections/${connectionId}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, preview: true }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Query execution failed');
      }

      const result = await response.json();
      setQueryResult(result);
    } catch (err) {
      console.error('Query execution error:', err);
      setError(err instanceof Error ? err.message : 'Failed to execute query');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleImport = async () => {
    if (!importName.trim()) {
      setError('Please enter a name for the import');
      return;
    }

    if (!queryResult || queryResult.rowCount === 0) {
      setError('No data to import. Please execute a query first.');
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      const response = await fetch(`/api/database-connections/${connectionId}/query-import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          name: importName,
          description: importDescription,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Import failed');
      }

      const result = await response.json();
      router.push(`/discovery?highlight=${result.dataSourceId}`);
    } catch (err) {
      console.error('Import error:', err);
      setError(err instanceof Error ? err.message : 'Failed to import data');
    } finally {
      setIsImporting(false);
    }
  };

  const handleEditorChange = useCallback((value: string | undefined) => {
    setQuery(value || '');
  }, []);

  const handleEditorDidMount = useCallback((editor: editor.IStandaloneCodeEditor, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
  }, []);


  return (
    <AppLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <Link
            href={`/sources/databases/${connectionId}`}
            className="inline-flex items-center text-blue-600 hover:text-blue-700"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Back to Database
          </Link>
        </div>

      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Database className="w-6 h-6 text-gray-500" />
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">Query Import</h1>
                {connection && (
                  <p className="text-sm text-gray-500 mt-1">
                    {connection.name} ({connection.type})
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Query Editor Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-medium text-gray-900">SQL Query</h2>
              <button
                onClick={executeQuery}
                disabled={isExecuting || !query.trim()}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4 mr-2" />
                {isExecuting ? 'Executing...' : 'Preview Results'}
              </button>
            </div>
            
            <div className="border border-gray-300 rounded-lg overflow-hidden">
              <Editor
                height="300px"
                defaultLanguage="sql"
                value={query}
                onChange={handleEditorChange}
                onMount={handleEditorDidMount}
                theme="vs-light"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  automaticLayout: true,
                  suggestOnTriggerCharacters: true,
                  quickSuggestions: true,
                  acceptSuggestionOnCommitCharacter: true,
                }}
              />
            </div>
            
            <p className="mt-2 text-sm text-gray-500">
              Write a SELECT query to choose the data you want to import. Results will be limited to 100 rows for preview.
              {connection?.type === 'mysql' && (
                <span className="block mt-1 text-xs">
                  MySQL: Use backticks for identifiers, e.g., {`SELECT \`column\` FROM \`table\``}
                </span>
              )}
              {connection?.type === 'postgresql' && (
                <span className="block mt-1 text-xs">
                  PostgreSQL: Use double quotes for case-sensitive identifiers, e.g., {`SELECT "Column" FROM "Table"`}
                </span>
              )}
            </p>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
                <p className="ml-2 text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Query Results */}
          {queryResult && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-medium text-gray-900">
                  Preview Results
                  <span className="ml-2 text-sm text-gray-500">
                    ({queryResult.rowCount} rows
                    {queryResult.executionTime && `, ${queryResult.executionTime}ms`})
                  </span>
                </h2>
              </div>

              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {queryResult.columns.map((column, index) => (
                          <th
                            key={index}
                            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                          >
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {queryResult.rows.slice(0, 10).map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {row.map((cell, cellIndex) => (
                            <td
                              key={cellIndex}
                              className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                            >
                              {cell === null ? (
                                <span className="text-gray-400 italic">null</span>
                              ) : (
                                String(cell)
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {queryResult.rows.length > 10 && (
                  <div className="bg-gray-50 px-6 py-3 text-sm text-gray-500 text-center">
                    Showing first 10 rows of {queryResult.rowCount} total
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Import Configuration */}
          {queryResult && queryResult.rowCount > 0 && (
            <div className="border-t pt-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Import Configuration</h2>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="import-name" className="block text-sm font-medium text-gray-700">
                    Import Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="import-name"
                    value={importName}
                    onChange={(e) => setImportName(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Customer Orders Q4 2024"
                  />
                </div>

                <div>
                  <label htmlFor="import-description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    id="import-description"
                    value={importDescription}
                    onChange={(e) => setImportDescription(e.target.value)}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Optional description of the imported data"
                  />
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={handleImport}
                    disabled={isImporting || !importName.trim()}
                    className="inline-flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Upload className="w-5 h-5 mr-2" />
                    {isImporting ? 'Importing...' : 'Import Data'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </AppLayout>
  );
}