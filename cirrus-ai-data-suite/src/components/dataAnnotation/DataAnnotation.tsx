import React from 'react';
import { ChevronLeft, Sparkles } from 'lucide-react';
import { DataAnnotationProps } from '@/types/dataAnnotation';
import { useDataAnnotation } from '@/hooks/useDataAnnotation';
import { PatternList } from './PatternList';
import { PatternSelector } from './PatternSelector';
import { DocumentSelector } from './DocumentSelector';
import { FeedbackButtons } from '../PatternFeedbackUI';

export function DataAnnotation({ 
  data, 
  onPatternsIdentified, 
  onBack, 
  initialPatterns, 
  continueButtonText = "Continue to Redaction" 
}: DataAnnotationProps) {
  const {
    // State
    selectedText,
    selectedPatternId,
    setSelectedPatternId,
    patterns,
    customLabel,
    setCustomLabel,
    showCustomForm,
    setShowCustomForm,
    currentDocumentIndex,
    setCurrentDocumentIndex,
    highlightedContent,
    isRunningML,
    mlHighlightedContent,
    showMLHighlights,
    feedbackUI,
    setFeedbackUI,
    contentRef,
    isContextClue,
    setIsContextClue,
    showAllPatterns,
    setShowAllPatterns,
    
    // Actions
    handleTextSelection,
    addExample,
    removeExample,
    addCustomPattern,
    removePattern,
    handleContinue,
    runMLDetection,
    handleFeedback,
    
    // Computed
    currentFile,
    patternsWithExamples,
    patternsInCurrentDocument
  } = useDataAnnotation({ data, onPatternsIdentified, initialPatterns });

  const handlePatternClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    
    // Check if clicked element is a highlight
    if (target.classList.contains('highlight-annotation')) {
      const patternLabel = target.getAttribute('data-pattern') || '';
      const patternId = target.getAttribute('data-pattern-id') || '';
      const matchedText = target.textContent || '';
      const confidence = parseFloat(target.getAttribute('data-confidence') || '1');
      const isContextClue = target.getAttribute('data-context-clue') === 'true';
      
      // Only show feedback UI for persisted patterns that are not context clues
      const isPersistedPattern = !patternId.startsWith('pattern-') && !patternId.startsWith('custom-');
      
      if (isPersistedPattern && !isContextClue) {
        const rect = target.getBoundingClientRect();
        setFeedbackUI({
          patternId: patternId,
          patternLabel: patternLabel,
          matchedText,
          confidence,
          position: {
            x: rect.left + rect.width / 2 - 100, // Center the feedback UI
            y: rect.top
          }
        });
      }
    }
  };

  // Ensure we have valid content to display
  const getDisplayContent = () => {
    if (!currentFile) return '';
    
    if (showMLHighlights && mlHighlightedContent[currentDocumentIndex]) {
      return mlHighlightedContent[currentDocumentIndex];
    }
    
    if (highlightedContent[currentDocumentIndex]) {
      return highlightedContent[currentDocumentIndex];
    }
    
    // Fallback to escaped plain content
    const div = document.createElement('div');
    div.textContent = currentFile.content || '';
    return div.innerHTML;
  };
  
  const displayContent = getDisplayContent();

  return (
    <div className="space-y-6 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </button>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Annotate Sensitive Data</h2>
          <p className="text-gray-600 text-sm mt-1">Select text and tag it as sensitive information • Use ← → arrow keys to navigate documents</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document Content */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Document Content</h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-blue-700 font-medium">
                {currentDocumentIndex + 1} of {data.length}
              </span>
            </div>
          </div>
          
          {/* Document Selector List */}
          <div className="mb-4">
            <DocumentSelector
              data={data}
              currentIndex={currentDocumentIndex}
              onSelectDocument={setCurrentDocumentIndex}
            />
          </div>
          
          {currentFile ? (
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-blue-900 truncate mr-2" title={currentFile.name}>
                  {currentFile.name}
                </h4>
                <div className="flex items-center gap-2">
                  <button
                    onClick={runMLDetection}
                    disabled={isRunningML || patterns.every(p => p.examples.length === 0)}
                    className={`text-xs px-3 py-1 rounded flex items-center gap-1 transition-colors ${
                      showMLHighlights 
                        ? 'bg-green-600 text-white hover:bg-green-700' 
                        : 'bg-purple-600 text-white hover:bg-purple-700'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={patterns.every(p => p.examples.length === 0) ? "Add pattern examples first" : "Use AI to detect sensitive data patterns"}
                  >
                    {isRunningML ? (
                      <>
                        <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
                        <span>Detecting...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3 w-3" />
                        <span>{showMLHighlights ? 'ML Active' : 'ML Detection'}</span>
                      </>
                    )}
                  </button>
                  {currentFile.type && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded flex-shrink-0">
                      {currentFile.type}
                    </span>
                  )}
                </div>
              </div>
              
              {currentFile.contentTruncated && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                  <p className="text-sm text-orange-800">
                    <strong>⚠️ Content Truncated:</strong> This document was truncated for storage efficiency. 
                    Showing {currentFile.content.length.toLocaleString()} of {currentFile.originalContentLength?.toLocaleString()} characters.
                    {currentFile.type === 'application/pdf' && (
                      <span> Use &ldquo;View Full Text&rdquo; to see what&apos;s available.</span>
                    )}
                  </p>
                </div>
              )}
              
              <div
                ref={contentRef}
                className="text-sm text-gray-900 whitespace-pre-wrap select-text cursor-text bg-white p-4 rounded border-2 border-gray-200 hover:border-blue-300 transition-colors shadow-sm min-h-[600px] max-h-[80vh] overflow-y-auto"
                onMouseUp={handleTextSelection}
                onClick={handlePatternClick}
              >
                {highlightedContent[currentDocumentIndex] || mlHighlightedContent[currentDocumentIndex] ? (
                  <div dangerouslySetInnerHTML={{ __html: displayContent }} />
                ) : (
                  <pre 
                    className="whitespace-pre-wrap font-mono text-sm"
                    onMouseUp={handleTextSelection}
                  >
                    {currentFile.content}
                  </pre>
                )}
              </div>
            </div>
          ) : (
            <div className="border rounded-lg p-4 text-center text-gray-500">
              <p>No document selected</p>
            </div>
          )}
        </div>

        {/* Pattern Selection */}
        <div className="space-y-4">
          {/* Pattern Selector Widget - Shows when text is selected */}
          {selectedText && (
            <div className="mb-6">
              <PatternSelector
                selectedText={selectedText}
                selectedPatternId={selectedPatternId}
                showCustomForm={showCustomForm}
                customLabel={customLabel}
                isContextClue={isContextClue}
                onAddExample={addExample}
                onShowCustomForm={() => setShowCustomForm(true)}
                onHideCustomForm={() => setShowCustomForm(false)}
                onCustomLabelChange={setCustomLabel}
                onAddCustomPattern={addCustomPattern}
                onSelectPattern={setSelectedPatternId}
                onToggleContextClue={setIsContextClue}
                patterns={patterns}
              />
            </div>
          )}
          
          {/* Show all patterns with toggle */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-gray-900">
                {patternsInCurrentDocument.length > 0 ? 'Detected Patterns' : 'All Patterns'}
              </h3>
              {patternsInCurrentDocument.length > 0 && patterns.length > patternsInCurrentDocument.length && (
                <button
                  onClick={() => setShowAllPatterns(!showAllPatterns)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  {showAllPatterns ? 'Show detected only' : `Show all (${patterns.length})`}
                </button>
              )}
            </div>
            
            <PatternList
              patterns={showAllPatterns ? patterns : (patternsInCurrentDocument.length > 0 ? patternsInCurrentDocument : patterns)}
              selectedPatternId={selectedPatternId}
              onSelectPattern={setSelectedPatternId}
              onRemovePattern={removePattern}
              onRemoveExample={removeExample}
            />
          </div>
          
          {/* Show placeholder when no patterns are detected in current document */}
          {patternsInCurrentDocument.length === 0 && !selectedText && !showAllPatterns && patterns.length === 0 && (
            <div className="bg-gray-50 rounded-lg p-6 text-center">
              <p className="text-gray-500">
                Select text in the document to start tagging sensitive data
              </p>
            </div>
          )}
          
          <div className="mt-6">
            <button
              onClick={handleContinue}
              disabled={patternsWithExamples.length === 0}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {continueButtonText} ({patternsWithExamples.length} patterns)
            </button>
          </div>
        </div>
      </div>

      {/* Feedback UI */}
      {feedbackUI && (
        <FeedbackButtons
          patternId={feedbackUI.patternId}
          patternLabel={feedbackUI.patternLabel}
          matchedText={feedbackUI.matchedText}
          confidence={feedbackUI.confidence}
          position={feedbackUI.position}
          onFeedback={handleFeedback}
          onClose={() => setFeedbackUI(null)}
        />
      )}
    </div>
  );
}