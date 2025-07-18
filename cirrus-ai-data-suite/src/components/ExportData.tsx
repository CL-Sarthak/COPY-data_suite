'use client';

import { useState } from 'react';
import { ChevronLeft, Download, FileText, Database, Code } from 'lucide-react';
import { ProcessingFile, ExportFormat } from '@/types';

interface ExportDataProps {
  redactedData: ProcessingFile[];
  onBack: () => void;
}

export function ExportData({ redactedData, onBack }: ExportDataProps) {
  const [exportFormat, setExportFormat] = useState<ExportFormat>('json');
  const [includeMetadata, setIncludeMetadata] = useState(true);

  const generateExportData = () => {
    switch (exportFormat) {
      case 'json':
        return JSON.stringify(redactedData.map(file => ({
          filename: file.name,
          originalContent: includeMetadata ? file.originalContent : undefined,
          redactedContent: file.redactedContent,
          redactionCount: includeMetadata ? file.redactionCount : undefined,
          processedAt: includeMetadata ? new Date().toISOString() : undefined,
        })), null, 2);

      case 'csv':
        const headers = ['filename', 'redactedContent'];
        if (includeMetadata) {
          headers.push('redactionCount', 'processedAt');
        }
        
        const csvRows = [headers.join(',')];
        redactedData.forEach(file => {
          const row = [
            `"${file.name}"`,
            `"${file.redactedContent?.replace(/"/g, '""') || ''}"`,
          ];
          if (includeMetadata) {
            row.push(
              file.redactionCount?.toString() || '0',
              `"${new Date().toISOString()}"`
            );
          }
          csvRows.push(row.join(','));
        });
        return csvRows.join('\n');

      case 'txt':
        return redactedData.map(file => 
          `=== ${file.name} ===\n${file.redactedContent}\n${includeMetadata ? `\nRedactions: ${file.redactionCount}\nProcessed: ${new Date().toISOString()}\n` : ''}\n`
        ).join('\n');

      default:
        return '';
    }
  };

  const downloadData = () => {
    const data = generateExportData();
    const blob = new Blob([data], { 
      type: exportFormat === 'json' ? 'application/json' : 
           exportFormat === 'csv' ? 'text/csv' : 'text/plain' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `redacted-data.${exportFormat}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const totalRedactions = redactedData.reduce((sum, file) => sum + (file.redactionCount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </button>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Export Redacted Data</h2>
          <p className="text-gray-600 text-sm mt-1">Download your redacted data for AI model training</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h3 className="font-medium text-green-900 mb-2">Processing Complete!</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-green-700">Files Processed:</span>
            <span className="font-medium ml-2">{redactedData.length}</span>
          </div>
          <div>
            <span className="text-green-700">Total Redactions:</span>
            <span className="font-medium ml-2">{totalRedactions}</span>
          </div>
          <div>
            <span className="text-green-700">Data Ready:</span>
            <span className="font-medium ml-2">Yes</span>
          </div>
        </div>
      </div>

      {/* Export Options */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="font-medium text-gray-900 mb-4">Export Settings</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Export Format
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setExportFormat('json')}
                className={`flex items-center justify-center p-3 border rounded-lg text-sm font-medium transition-colors ${
                  exportFormat === 'json'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Code className="h-4 w-4 mr-2" />
                JSON
              </button>
              <button
                onClick={() => setExportFormat('csv')}
                className={`flex items-center justify-center p-3 border rounded-lg text-sm font-medium transition-colors ${
                  exportFormat === 'csv'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Database className="h-4 w-4 mr-2" />
                CSV
              </button>
              <button
                onClick={() => setExportFormat('txt')}
                className={`flex items-center justify-center p-3 border rounded-lg text-sm font-medium transition-colors ${
                  exportFormat === 'txt'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FileText className="h-4 w-4 mr-2" />
                TXT
              </button>
            </div>
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="includeMetadata"
              checked={includeMetadata}
              onChange={(e) => setIncludeMetadata(e.target.checked)}
              className="h-4 w-4 text-blue-600 rounded border-gray-300"
            />
            <label htmlFor="includeMetadata" className="ml-2 text-sm text-gray-700">
              Include metadata (redaction counts, timestamps, original content)
            </label>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="font-medium text-gray-900 mb-4">Preview</h3>
        <div className="bg-gray-50 rounded border p-4 max-h-64 overflow-y-auto">
          <pre className="text-xs text-gray-700 whitespace-pre-wrap">
            {generateExportData().substring(0, 1000)}
            {generateExportData().length > 1000 && '...'}
          </pre>
        </div>
      </div>

      {/* Processed Files */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="font-medium text-gray-900 mb-4">Processed Files</h3>
        <div className="space-y-3">
          {redactedData.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 truncate" title={file.name}>{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {file.redactionCount} redactions made
                  </p>
                </div>
              </div>
              <span className="text-xs text-green-600 font-medium">✓ Processed</span>
            </div>
          ))}
        </div>
      </div>

      {/* Download Button */}
      <div className="flex justify-center">
        <button
          onClick={downloadData}
          className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          <Download className="h-5 w-5 mr-2" />
          Download Redacted Data
        </button>
      </div>

      {/* Usage Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-medium text-blue-900 mb-2">Next Steps</h3>
        <div className="text-sm text-blue-800 space-y-1">
          <p>• Use the downloaded data to train your AI models with redacted sensitive information</p>
          <p>• The redacted data maintains structure while protecting privacy</p>
          <p>• Consider validating the redactions before using in production systems</p>
          <p>• Store the original-to-redacted mappings securely if needed for audit purposes</p>
        </div>
      </div>
    </div>
  );
}