'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X } from 'lucide-react';
import { FileData } from '@/types';
import { useDialog } from '@/contexts/DialogContext';


interface FileUploadProps {
  title: string;
  description: string;
  onFilesUploaded: (files: FileData[]) => void;
}

export function FileUpload({ title, description, onFilesUploaded }: FileUploadProps) {
  const dialog = useDialog();
  const [files, setFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);

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

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const extractTextFromPdf = async (file: File): Promise<string> => {
    const pdfjs = await import('pdfjs-dist');
    
    // Use CDN worker that matches the installed version
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.2.133/pdf.worker.min.js`;
    
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
    setProcessing(true);
    
    const processedFiles = await Promise.all(
      files.map(async (file) => {
        // Check file size limit - allow up to 50MB, backend will handle storage
        const maxSize = 50 * 1024 * 1024; // 50MB - backend will handle external storage
        const maxSizeMB = maxSize / (1024 * 1024);
        
        if (file.size > maxSize) {
          dialog.showAlert({
            title: 'File Too Large',
            message: `File "${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is ${maxSizeMB}MB.`,
            type: 'warning'
          });
          return null;
        }
        
        let text: string;
        
        if (file.type === 'application/pdf') {
          text = await extractTextFromPdf(file);
        } else {
          text = await file.text();
        }
        
        // Send full content to backend - it will handle external storage and truncation
        return {
          name: file.name,
          type: file.type,
          size: file.size,
          content: text, // Full content - backend will store in external storage
          contentTruncated: false,
          originalContentLength: text.length,
          id: Math.random().toString(36).substr(2, 9),
        };
      })
    );

    // Filter out null results (files that were too large)
    const validFiles = processedFiles.filter(f => f !== null) as FileData[];
    onFilesUploaded(validFiles);
    setProcessing(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-blue-900 mb-3">{title}</h2>
        <p className="text-blue-700 text-lg">{description}</p>
      </div>

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 ${
          isDragActive
            ? 'border-blue-500 bg-blue-50 shadow-lg'
            : 'border-blue-200 hover:border-blue-400 hover:bg-blue-50 hover:shadow-md'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="mx-auto h-14 w-14 text-blue-400 mb-6" />
        {isDragActive ? (
          <p className="text-xl font-medium text-blue-700">Drop the files here...</p>
        ) : (
          <div>
            <p className="text-blue-700 mb-3 text-lg">
              <span className="font-semibold text-blue-900">Click to upload</span> or drag and drop
            </p>
            <p className="text-blue-600 font-medium">
              Supports TXT, CSV, JSON, PDF, and DOCX files
            </p>
          </div>
        )}
      </div>

      {files.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-semibold text-blue-900 text-lg">Uploaded Files</h3>
          <div className="space-y-3">
            {files.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-100">
                <div className="flex items-center space-x-3">
                  <File className="h-6 w-6 text-blue-500" />
                  <div>
                    <p className="font-medium text-blue-900">{file.name}</p>
                    <p className="text-sm text-blue-600">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="text-blue-400 hover:text-red-500 transition-colors p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <button
              onClick={processFiles}
              disabled={processing}
              className="px-6 py-3 bg-blue-900 text-white font-semibold rounded-xl hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              {processing ? 'Processing...' : 'Continue to Annotation'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}