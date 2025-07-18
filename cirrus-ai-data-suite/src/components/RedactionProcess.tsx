'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { ChevronLeft, Upload, File, Bot, CheckCircle, AlertCircle } from 'lucide-react';
import { SensitivePattern, ProcessingFile } from '@/types';

interface RedactionProcessProps {
  patterns: SensitivePattern[];
  onDataProcessed: (processed: ProcessingFile[]) => void;
  onBack: () => void;
}


export function RedactionProcess({ patterns, onDataProcessed, onBack }: RedactionProcessProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [processingFiles, setProcessingFiles] = useState<ProcessingFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(prev => [...prev, ...acceptedFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/plain': ['.txt'],
      'text/csv': ['.csv'],
      'application/json': ['.json'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
  });

  const extractTextFromPdf = async (file: File): Promise<string> => {
    const pdfjs = await import('pdfjs-dist');
    
    // Configure worker from local public directory
    pdfjs.GlobalWorkerOptions.workerSrc = `/pdf.worker.min.js`;
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
    let text = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const textItems = (textContent.items as any[]).filter((item) => 'str' in item);
      
      // Process text items to preserve spacing and line breaks
      let pageText = '';
      let lastY = -1;
      let lastX = -1;
      
      for (const item of textItems) {
        const currentY = item.transform[5]; // Y coordinate
        const currentX = item.transform[4]; // X coordinate
        
        // If this is a new line (different Y coordinate)
        if (lastY !== -1 && Math.abs(currentY - lastY) > 5) {
          pageText += '\n';
        }
        // If there's a significant horizontal gap, add space
        else if (lastX !== -1 && currentX - lastX > 10) {
          pageText += ' ';
        }
        
        pageText += item.str;
        lastY = currentY;
        lastX = currentX + (item.width || 0);
      }
      
      text += pageText + '\n\n'; // Double newline between pages
    }
    
    return text;
  };

  const processFiles = async () => {
    setIsProcessing(true);
    
    const initialProcessingFiles: ProcessingFile[] = await Promise.all(
      files.map(async (file) => {
        let content: string;
        
        if (file.type === 'application/pdf') {
          content = await extractTextFromPdf(file);
        } else {
          content = await file.text();
        }
        
        return {
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          content,
          originalContent: content,
          status: 'pending' as const,
        };
      })
    );

    setProcessingFiles(initialProcessingFiles);

    const processedFiles = [];

    for (const file of initialProcessingFiles) {
      setProcessingFiles(prev => 
        prev.map(f => f.id === file.id ? { ...f, status: 'processing' } : f)
      );

      try {
        const redactedContent = await redactWithClaude(file.content, patterns);
        const redactionCount = countRedactions(file.content, redactedContent);

        const processedFile = {
          ...file,
          status: 'completed' as const,
          redactedContent,
          redactionCount,
        };

        setProcessingFiles(prev => 
          prev.map(f => f.id === file.id ? processedFile : f)
        );

        processedFiles.push(processedFile);
      } catch {
        setProcessingFiles(prev => 
          prev.map(f => f.id === file.id ? { ...f, status: 'error' } : f)
        );
      }
    }

    setIsProcessing(false);
    onDataProcessed(processedFiles);
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const generateSimilarReplacement = (originalText: string, patternType: string): string => {
    const text = originalText.trim();
    
    // Generate replacements based on pattern characteristics
    switch (patternType.toLowerCase()) {
      case 'social security number':
      case 'ssn':
        return Math.random().toString().slice(2, 5) + '-' + 
               Math.random().toString().slice(2, 4) + '-' + 
               Math.random().toString().slice(2, 6);
      
      case 'email address':
      case 'email':
        const randomUser = Math.random().toString(36).substring(2, 8);
        const domains = ['example.com', 'test.org', 'sample.net', 'demo.co'];
        const randomDomain = domains[Math.floor(Math.random() * domains.length)];
        return `${randomUser}@${randomDomain}`;
      
      case 'phone number':
      case 'phone':
        const areaCode = Math.floor(Math.random() * 800) + 200;
        const exchange = Math.floor(Math.random() * 800) + 200;
        const number = Math.floor(Math.random() * 9000) + 1000;
        return `(${areaCode}) ${exchange}-${number}`;
      
      case 'credit card number':
      case 'credit card':
        return Array.from({length: 4}, () => 
          Math.floor(Math.random() * 9000) + 1000
        ).join('-');
      
      default:
        // For other patterns, generate similar text maintaining length and character types
        if (/^\d+$/.test(text)) {
          // All digits - generate random number of same length
          return Math.random().toString().slice(2, 2 + text.length);
        } else if (/^[A-Z]+$/.test(text)) {
          // All uppercase letters
          return Array.from({length: text.length}, () => 
            String.fromCharCode(65 + Math.floor(Math.random() * 26))
          ).join('');
        } else if (/^[a-z]+$/.test(text)) {
          // All lowercase letters
          return Array.from({length: text.length}, () => 
            String.fromCharCode(97 + Math.floor(Math.random() * 26))
          ).join('');
        } else if (/^[A-Za-z]+$/.test(text)) {
          // Mixed case letters
          return Array.from({length: text.length}, () => {
            const isUpper = Math.random() > 0.5;
            const base = isUpper ? 65 : 97;
            return String.fromCharCode(base + Math.floor(Math.random() * 26));
          }).join('');
        } else {
          // Mixed content - preserve structure but randomize
          return text.split('').map(char => {
            if (/\d/.test(char)) return Math.floor(Math.random() * 10).toString();
            if (/[A-Z]/.test(char)) return String.fromCharCode(65 + Math.floor(Math.random() * 26));
            if (/[a-z]/.test(char)) return String.fromCharCode(97 + Math.floor(Math.random() * 26));
            return char; // Keep special characters as-is
          }).join('');
        }
    }
  };

  const redactWithClaude = async (content: string, patterns: SensitivePattern[]): Promise<string> => {
    const patternDescriptions = patterns.map(p => 
      `${p.label}: ${p.examples.join(', ')}`
    ).join('\n');

    const prompt = `You are a data redaction tool. Replace sensitive information in the following text with statistically similar replacements that maintain the same format and length.

Sensitive data patterns to redact:
${patternDescriptions}

Rules:
1. Replace each sensitive item with similar-looking fake data that matches the same format
2. For SSNs: use format like 123-45-6789 with different random numbers
3. For emails: use fake emails like user123@example.com
4. For phone numbers: use fake numbers in same format
5. For names: use different fake names of similar length
6. For other text: maintain same length and character types (uppercase/lowercase/numbers/symbols)
7. Keep the text structure and readability intact
8. Be consistent - if you see the same sensitive data twice, replace it with the same fake replacement
9. Only replace data that clearly matches the sensitive patterns provided

Text to redact:
${content}

Return only the text with sensitive data replaced by similar fake data:`;

    try {
      const response = await fetch('/api/redact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) {
        throw new Error('Failed to redact content');
      }

      const result = await response.json();
      return result.redactedText;
    } catch (error) {
      console.error('Error redacting content:', error);
      return content; // Return original if redaction fails
    }
  };

  const countRedactions = (original: string, redacted: string): number => {
    // Simple word-by-word comparison to estimate redactions
    const originalWords = original.split(/\s+/);
    const redactedWords = redacted.split(/\s+/);
    
    if (originalWords.length !== redactedWords.length) {
      // If lengths differ significantly, estimate based on overall change
      return Math.floor(Math.abs(original.length - redacted.length) / 10);
    }
    
    let changes = 0;
    for (let i = 0; i < Math.min(originalWords.length, redactedWords.length); i++) {
      if (originalWords[i] !== redactedWords[i]) {
        changes++;
      }
    }
    
    return changes;
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

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
          <h2 className="text-xl font-semibold text-gray-900">Process Data for Redaction</h2>
          <p className="text-gray-600 text-sm mt-1">Upload files to redact using Claude AI</p>
        </div>
      </div>

      {/* Pattern Summary */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-2">Configured Redaction Patterns</h3>
        <div className="flex flex-wrap gap-2">
          {patterns.map(pattern => (
            <span key={pattern.id} className={`px-2 py-1 rounded-full text-xs font-medium ${pattern.color}`}>
              {pattern.label} ({pattern.examples.length} examples)
            </span>
          ))}
        </div>
      </div>

      {/* File Upload */}
      {processingFiles.length === 0 && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          {isDragActive ? (
            <p className="text-blue-600">Drop the files here...</p>
          ) : (
            <div>
              <p className="text-gray-600 mb-2">
                <span className="font-medium text-blue-600">Click to upload</span> or drag and drop
              </p>
              <p className="text-sm text-gray-500">
                Supports TXT, CSV, JSON, PDF, and DOCX files
              </p>
            </div>
          )}
        </div>
      )}

      {/* Files to Process */}
      {files.length > 0 && processingFiles.length === 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-gray-900">Files to Process</h3>
          <div className="space-y-2">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <File className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate" title={file.name}>{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              onClick={processFiles}
              disabled={isProcessing}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Bot className="h-4 w-4 mr-2" />
              {isProcessing ? 'Processing with Claude...' : 'Start Redaction'}
            </button>
          </div>
        </div>
      )}

      {/* Processing Status */}
      {processingFiles.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-medium text-gray-900">Processing Status</h3>
          <div className="space-y-3">
            {processingFiles.map(file => (
              <div key={file.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <File className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <span className="font-medium text-gray-900 truncate" title={file.name}>{file.name}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {file.status === 'pending' && (
                      <span className="text-sm text-gray-500">Pending</span>
                    )}
                    {file.status === 'processing' && (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                        <span className="text-sm text-blue-600">Processing...</span>
                      </div>
                    )}
                    {file.status === 'completed' && (
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-green-600">
                          Completed ({file.redactionCount} redactions)
                        </span>
                      </div>
                    )}
                    {file.status === 'error' && (
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <span className="text-sm text-red-600">Error</span>
                      </div>
                    )}
                  </div>
                </div>

                {file.status === 'completed' && file.redactedContent && (
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Original</h4>
                      <div className="text-xs bg-gray-50 p-3 rounded border max-h-32 overflow-y-auto">
                        {file.originalContent}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Redacted</h4>
                      <div className="text-xs bg-green-50 p-3 rounded border max-h-32 overflow-y-auto">
                        {file.redactedContent}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {!isProcessing && processingFiles.every(f => f.status === 'completed' || f.status === 'error') && (
            <div className="flex justify-end">
              <button
                onClick={() => onDataProcessed(processingFiles.filter((f: ProcessingFile) => f.status === 'completed'))}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Continue to Export
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}