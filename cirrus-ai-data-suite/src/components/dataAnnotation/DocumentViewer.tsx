import React from 'react';
import { FileData } from '@/types';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';
import { MAX_DISPLAY_LENGTH } from '@/types/dataAnnotation';

interface DocumentViewerProps {
  currentFile: FileData;
  currentIndex: number;
  totalDocuments: number;
  isFirstDocument: boolean;
  isLastDocument: boolean;
  showFullText: boolean;
  highlightedContent: string;
  mlHighlightedContent?: string;
  showMLHighlights: boolean;
  isRunningML: boolean;
  contentRef: React.RefObject<HTMLDivElement>;
  onPreviousDocument: () => void;
  onNextDocument: () => void;
  onToggleFullText: () => void;
  onTextSelection: () => void;
  onHighlightClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onRunML: () => void;
  onToggleMLHighlights: () => void;
}

export function DocumentViewer({
  currentFile,
  currentIndex,
  totalDocuments,
  isFirstDocument,
  isLastDocument,
  showFullText,
  highlightedContent,
  mlHighlightedContent,
  showMLHighlights,
  isRunningML,
  contentRef,
  onPreviousDocument,
  onNextDocument,
  onToggleFullText,
  onTextSelection,
  onHighlightClick,
  onRunML,
  onToggleMLHighlights
}: DocumentViewerProps) {
  const displayContent = showMLHighlights && mlHighlightedContent ? mlHighlightedContent : highlightedContent;
  const isLongContent = currentFile.content.length > MAX_DISPLAY_LENGTH;
  const shouldTruncate = isLongContent && !showFullText;
  
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">{currentFile.name}</h3>
            <p className="text-sm text-gray-500">
              Document {currentIndex + 1} of {totalDocuments}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {/* ML Detection Button */}
            <button
              onClick={onRunML}
              disabled={isRunningML}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
                isRunningML
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 text-white hover:bg-purple-700'
              }`}
            >
              <Sparkles className={`h-4 w-4 ${isRunningML ? 'animate-pulse' : ''}`} />
              {isRunningML ? 'Running ML...' : 'Run ML Detection'}
            </button>
            
            {mlHighlightedContent && (
              <button
                onClick={onToggleMLHighlights}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  showMLHighlights
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {showMLHighlights ? 'Show Regular' : 'Show ML Results'}
              </button>
            )}
            
            {/* Navigation Buttons */}
            <button
              onClick={onPreviousDocument}
              disabled={isFirstDocument}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={onNextDocument}
              disabled={isLastDocument}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div
          ref={contentRef}
          className="prose prose-sm max-w-none"
          onMouseUp={onTextSelection}
          onClick={onHighlightClick}
        >
          <div
            dangerouslySetInnerHTML={{
              __html: shouldTruncate 
                ? displayContent.substring(0, MAX_DISPLAY_LENGTH) + '...' 
                : displayContent
            }}
          />
        </div>
        
        {isLongContent && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button
              onClick={onToggleFullText}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              {showFullText ? 'Show less' : 'Show full document'} 
              ({Math.round(currentFile.content.length / 1024)}KB)
            </button>
          </div>
        )}
      </div>

      {/* ML Status */}
      {showMLHighlights && mlHighlightedContent && (
        <div className="border-t border-gray-200 px-6 py-3 bg-purple-50">
          <p className="text-sm text-purple-700">
            Showing ML-detected patterns with advanced matching
          </p>
        </div>
      )}
    </div>
  );
}