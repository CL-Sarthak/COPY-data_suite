import { useState, useEffect, useCallback, useRef } from 'react';
import { SensitivePattern } from '@/types';
import { 
  FeedbackUIState, 
  DataAnnotationProps 
} from '@/types/dataAnnotation';
import { DataAnnotationService } from '@/services/dataAnnotationService';
import { useToastActions } from '@/contexts/ToastContext';
import { FeedbackType } from '@/types/feedback';
import { RefinedPattern } from '@/services/refinedPatternClient';

export function useDataAnnotation({
  data,
  onPatternsIdentified,
  initialPatterns
}: Pick<DataAnnotationProps, 'data' | 'onPatternsIdentified' | 'initialPatterns'>) {
  // Core state
  const [selectedText, setSelectedText] = useState('');
  const [selectedPatternId, setSelectedPatternId] = useState<string>('');
  const [patterns, setPatterns] = useState<SensitivePattern[]>([]);
  const [showAllPatterns, setShowAllPatterns] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [currentDocumentIndex, setCurrentDocumentIndex] = useState(0);
  const [highlightedContent, setHighlightedContent] = useState<Record<number, string>>({});
  const [showFullText, setShowFullText] = useState(false);
  const [isRunningML, setIsRunningML] = useState(false);
  const [mlHighlightedContent, setMlHighlightedContent] = useState<Record<number, string>>({});
  const [showMLHighlights, setShowMLHighlights] = useState(false);
  const [isContextClue, setIsContextClue] = useState(false);
  
  // Feedback UI state
  const [feedbackUI, setFeedbackUI] = useState<FeedbackUIState | null>(null);
  
  // Refined patterns
  const [refinedPatterns, setRefinedPatterns] = useState<RefinedPattern[]>([]);
  
  const showToast = useToastActions();
  const contentRef = useRef<HTMLDivElement>(null);

  // Initialize patterns
  useEffect(() => {
    const initializedPatterns = DataAnnotationService.initializePatterns(initialPatterns);
    setPatterns(initializedPatterns);
  }, [initialPatterns]);

  // Fetch refined patterns
  useEffect(() => {
    const fetchRefinedPatterns = async () => {
      // Only fetch if we have patterns with IDs that match database patterns
      if (patterns.some(p => !p.id.startsWith('pattern-') && !p.id.startsWith('custom-'))) {
        const refined = await DataAnnotationService.loadRefinedPatterns();
        setRefinedPatterns(refined);
      }
    };
    
    fetchRefinedPatterns();
  }, [patterns]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName === 'INPUT') return;
      
      if (e.key === 'ArrowLeft' && currentDocumentIndex > 0) {
        setCurrentDocumentIndex(currentDocumentIndex - 1);
        e.preventDefault();
      } else if (e.key === 'ArrowRight' && currentDocumentIndex < data.length - 1) {
        setCurrentDocumentIndex(currentDocumentIndex + 1);
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentDocumentIndex, data.length]);

  // Apply highlighting when patterns or document changes
  useEffect(() => {
    const applyHighlighting = async () => {
      const currentFile = data[currentDocumentIndex];
      if (!currentFile) return;


      const matches = await DataAnnotationService.findPatternMatches(
        currentFile.content,
        patterns,
        refinedPatterns
      );


      const highlighted = DataAnnotationService.applyHighlighting(
        currentFile.content,
        matches
      );

      setHighlightedContent(prev => ({
        ...prev,
        [currentDocumentIndex]: highlighted
      }));
    };

    applyHighlighting();
  }, [patterns, currentDocumentIndex, data, refinedPatterns]);


  // Text selection handler
  const handleTextSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      const text = selection.toString().trim();
      setSelectedText(text);
    } else {
      // Clear selection if no text is selected
      setSelectedText('');
    }
  }, []);

  // Add example to pattern
  const addExample = useCallback(() => {
    if (!selectedText || !selectedPatternId) return;

    setPatterns(prevPatterns => 
      prevPatterns.map(pattern => {
        if (pattern.id === selectedPatternId) {
          const updatedPattern = DataAnnotationService.addExampleToPattern(pattern, selectedText);
          // Set the context clue flag if enabled
          if (isContextClue) {
            updatedPattern.isContextClue = true;
          }
          return updatedPattern;
        }
        return pattern;
      })
    );

    setSelectedText('');
    setSelectedPatternId('');
    setIsContextClue(false); // Reset context clue checkbox
    window.getSelection()?.removeAllRanges();
  }, [selectedText, selectedPatternId, isContextClue]);

  // Remove example from pattern
  const removeExample = useCallback((patternId: string, exampleIndex: number) => {
    setPatterns(prevPatterns =>
      prevPatterns.map(pattern => {
        if (pattern.id === patternId) {
          return DataAnnotationService.removeExampleFromPattern(pattern, exampleIndex);
        }
        return pattern;
      })
    );
  }, []);

  // Add custom pattern
  const addCustomPattern = useCallback(() => {
    if (!customLabel.trim()) return;

    const newPattern = DataAnnotationService.createCustomPattern(customLabel);
    // Set the context clue flag if enabled
    if (isContextClue) {
      newPattern.isContextClue = true;
    }
    setPatterns(prev => [newPattern, ...prev]);
    setCustomLabel('');
    setShowCustomForm(false);
    setIsContextClue(false); // Reset context clue checkbox
  }, [customLabel, isContextClue]);

  // Remove pattern
  const removePattern = useCallback((patternId: string) => {
    const pattern = patterns.find(p => p.id === patternId);
    if (!pattern) return;
    
    // For predefined patterns, show a confirmation
    if (pattern.id.startsWith('pattern-')) {
      const confirmMessage = `Are you sure you want to remove the "${pattern.label}" pattern? This will remove it from this session only.`;
      if (!window.confirm(confirmMessage)) {
        return;
      }
    }
    
    setPatterns(prev => prev.filter(pattern => pattern.id !== patternId));
  }, [patterns]);

  // Handle continue
  const handleContinue = useCallback(() => {
    const patternsWithExamples = DataAnnotationService.getPatternsWithExamples(patterns);
    onPatternsIdentified(patternsWithExamples);
  }, [patterns, onPatternsIdentified]);

  // Run ML detection
  const runMLDetection = useCallback(async () => {
    setIsRunningML(true);
    setShowMLHighlights(true);
    
    try {
      const mlResults = await DataAnnotationService.runMLDetection(data, patterns);
      
      // Apply highlighting for all documents
      const highlighted: Record<number, string> = {};
      for (let i = 0; i < data.length; i++) {
        const matches = mlResults[i] || [];
        highlighted[i] = DataAnnotationService.applyHighlighting(
          data[i].content,
          matches
        );
      }
      
      setMlHighlightedContent(highlighted);
      showToast.success('ML pattern detection completed');
    } catch (error) {
      showToast.error('Failed to run ML detection');
      console.error('ML detection error:', error);
    } finally {
      setIsRunningML(false);
    }
  }, [data, patterns, showToast]);

  // Handle feedback
  const handleFeedback = useCallback(async (feedbackType: FeedbackType) => {
    if (!feedbackUI) return;

    try {
      await DataAnnotationService.storeFeedback(
        feedbackUI.patternId,
        feedbackUI.patternLabel,
        feedbackUI.matchedText,
        feedbackType
      );

      // Update refined patterns after feedback
      const refined = await DataAnnotationService.loadRefinedPatterns();
      setRefinedPatterns(refined);
      
      showToast.success(`Feedback recorded: ${feedbackType === 'positive' ? '👍' : '👎'}`);
      setFeedbackUI(null);
    } catch (err) {
      showToast.error('Failed to record feedback');
      console.error('Feedback error:', err);
    }
  }, [feedbackUI, showToast]);


  return {
    // State
    selectedText,
    setSelectedText,
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
    showFullText,
    setShowFullText,
    isRunningML,
    mlHighlightedContent,
    showMLHighlights,
    setShowMLHighlights,
    feedbackUI,
    setFeedbackUI,
    refinedPatterns,
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
    currentFile: data[currentDocumentIndex],
    isFirstDocument: currentDocumentIndex === 0,
    isLastDocument: currentDocumentIndex === data.length - 1,
    totalDocuments: data.length,
    patternsWithExamples: patterns.filter(p => p.examples.length > 0),
    patternsInCurrentDocument: patterns.filter(p => {
      // Only show patterns that have examples AND have matches in the current document
      if (p.examples.length === 0) return false;
      
      const currentContent = data[currentDocumentIndex]?.content || '';
      
      // Check if any examples match in the current document
      const hasExampleMatch = p.examples.some(example => 
        currentContent.includes(example) || 
        currentContent.toLowerCase().includes(example.toLowerCase())
      );
      
      // Check if regex matches
      let hasRegexMatch = false;
      if (p.regex) {
        try {
          const regex = new RegExp(p.regex, 'gi');
          hasRegexMatch = regex.test(currentContent);
        } catch {
          // Invalid regex, ignore
        }
      }
      
      return hasExampleMatch || hasRegexMatch;
    })
  };
}