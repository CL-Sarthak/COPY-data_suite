'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, Tag, Plus, Trash2, X, Sparkles } from 'lucide-react';
import { FileData, SensitivePattern } from '@/types';
import { patternTestingService } from '@/services/patternTestingService';
import { PatternLearningService } from '@/services/patternLearningService';
import { FeedbackButtons, PatternAccuracyBadge, FeedbackStats } from './PatternFeedbackUI';
import { useToast } from '@/contexts/ToastContext';
import { FeedbackType } from '@/types/feedback';
import { RefinedPatternClient, RefinedPattern } from '@/services/refinedPatternClient';

interface DataAnnotationProps {
  data: FileData[];
  onPatternsIdentified: (patterns: SensitivePattern[]) => void;
  onBack: () => void;
  initialPatterns?: SensitivePattern[];
  continueButtonText?: string;
}


const predefinedPatterns: Omit<SensitivePattern, 'id' | 'examples'>[] = [
  // PII Patterns
  { label: 'Social Security Number', color: 'bg-red-100 text-red-800', type: 'PII' },
  { label: 'Email Address', color: 'bg-blue-100 text-blue-800', type: 'PII' },
  { label: 'Phone Number', color: 'bg-green-100 text-green-800', type: 'PII' },
  { label: 'Address', color: 'bg-emerald-100 text-emerald-800', type: 'PII' },
  { label: 'Driver License', color: 'bg-amber-100 text-amber-800', type: 'PII' },
  { label: 'Passport Number', color: 'bg-teal-100 text-teal-800', type: 'PII' },
  { label: 'Date of Birth', color: 'bg-cyan-100 text-cyan-800', type: 'PII' },
  
  // Financial Patterns
  { label: 'Credit Card Number', color: 'bg-yellow-100 text-yellow-800', type: 'FINANCIAL' },
  { label: 'Bank Account Number', color: 'bg-purple-100 text-purple-800', type: 'FINANCIAL' },
  { label: 'IBAN', color: 'bg-indigo-100 text-indigo-800', type: 'FINANCIAL' },
  { label: 'SWIFT Code', color: 'bg-violet-100 text-violet-800', type: 'FINANCIAL' },
  
  // Healthcare/HIPAA Patterns
  { label: 'Medical Record Number', color: 'bg-pink-100 text-pink-800', type: 'MEDICAL' },
  { label: 'Health Insurance ID', color: 'bg-rose-100 text-rose-800', type: 'MEDICAL' },
  { label: 'Medicare/Medicaid ID', color: 'bg-fuchsia-100 text-fuchsia-800', type: 'MEDICAL' },
  { label: 'Provider NPI', color: 'bg-pink-200 text-pink-900', type: 'MEDICAL' },
  { label: 'Diagnosis Code (ICD)', color: 'bg-rose-200 text-rose-900', type: 'MEDICAL' },
  { label: 'Procedure Code (CPT)', color: 'bg-fuchsia-200 text-fuchsia-900', type: 'MEDICAL' },
  { label: 'Drug NDC', color: 'bg-purple-200 text-purple-900', type: 'MEDICAL' },
  { label: 'Clinical Trial ID', color: 'bg-violet-200 text-violet-900', type: 'MEDICAL' },
  
  // Government/Intelligence Classification
  { label: 'Top Secret', color: 'bg-red-100 text-red-900', type: 'CLASSIFICATION' },
  { label: 'Secret', color: 'bg-red-100 text-red-800', type: 'CLASSIFICATION' },
  { label: 'Confidential', color: 'bg-orange-100 text-orange-800', type: 'CLASSIFICATION' },
  { label: 'NOFORN', color: 'bg-purple-100 text-purple-900', type: 'CLASSIFICATION' },
  { label: 'FOUO', color: 'bg-yellow-100 text-yellow-900', type: 'CLASSIFICATION' },
  { label: 'SCI', color: 'bg-red-200 text-red-900', type: 'CLASSIFICATION' },
  { label: 'SAP', color: 'bg-purple-200 text-purple-900', type: 'CLASSIFICATION' },
  { label: 'Codeword', color: 'bg-indigo-100 text-indigo-900', type: 'CLASSIFICATION' },
  { label: 'ITAR', color: 'bg-orange-200 text-orange-900', type: 'CLASSIFICATION' },
  { label: 'CUI', color: 'bg-amber-200 text-amber-900', type: 'CLASSIFICATION' },
  
  // Business/Corporate
  { label: 'Company Confidential', color: 'bg-orange-100 text-orange-900', type: 'CLASSIFICATION' },
  { label: 'Trade Secret', color: 'bg-violet-100 text-violet-900', type: 'CLASSIFICATION' },
  { label: 'Proprietary', color: 'bg-blue-200 text-blue-900', type: 'CLASSIFICATION' },
];

export function DataAnnotation({ data, onPatternsIdentified, onBack, initialPatterns, continueButtonText = "Continue to Redaction" }: DataAnnotationProps) {
  const [selectedText, setSelectedText] = useState('');
  const [selectedPatternId, setSelectedPatternId] = useState<string>('');
  const [patterns, setPatterns] = useState<SensitivePattern[]>([]);
  const [customLabel, setCustomLabel] = useState('');
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [currentDocumentIndex, setCurrentDocumentIndex] = useState(0);
  const [highlightedContent, setHighlightedContent] = useState<Record<number, string>>({});
  const [showFullText, setShowFullText] = useState(false);
  const [isRunningML, setIsRunningML] = useState(false);
  const [mlHighlightedContent, setMlHighlightedContent] = useState<Record<number, string>>({});
  const [showMLHighlights, setShowMLHighlights] = useState(false);
  
  // Feedback UI state
  const [feedbackUI, setFeedbackUI] = useState<{
    patternId: string;
    patternLabel: string;
    matchedText: string;
    confidence?: number;
    position: { x: number; y: number };
  } | null>(null);
  
  const { showToast } = useToast();
  const contentRef = useRef<HTMLDivElement>(null);
  const [refinedPatterns, setRefinedPatterns] = useState<RefinedPattern[]>([]);

  // Fetch refined patterns when patterns change
  useEffect(() => {
    const fetchRefinedPatterns = async () => {
      const refined = await RefinedPatternClient.getAllRefinedPatterns();
      setRefinedPatterns(refined);
    };
    
    // Only fetch if we have patterns with IDs that match database patterns
    if (patterns.some(p => !p.id.startsWith('pattern-') && !p.id.startsWith('custom-'))) {
      fetchRefinedPatterns();
    }
  }, [patterns]);

  useEffect(() => {
    console.log('=== DataAnnotation INITIAL PATTERNS ===');
    console.log('Initial patterns:', initialPatterns);
    
    // Always start with all predefined patterns
    const defaultPatterns: SensitivePattern[] = predefinedPatterns.map((pattern, index) => ({
      ...pattern,
      id: `pattern-${index}`,
      examples: [] as string[],
      existingExamples: [] as string[], // Track examples that came from existing patterns
    }));

    if (initialPatterns && initialPatterns.length > 0) {
      // Merge session patterns with predefined patterns
      const mergedPatterns = [...defaultPatterns];
      
      // Update predefined patterns with examples from session
      initialPatterns.forEach(sessionPattern => {
        
        // Try to match by ID first (more reliable), then by label as fallback
        let existingIndex = mergedPatterns.findIndex(p => p.id === sessionPattern.id);
        if (existingIndex === -1) {
          existingIndex = mergedPatterns.findIndex(p => p.label === sessionPattern.label && p.type === sessionPattern.type);
        }
        
        if (existingIndex >= 0) {
          
          // Verify we're updating the right pattern by checking type compatibility
          if (mergedPatterns[existingIndex].type === sessionPattern.type) {
            // Update existing predefined pattern with examples AND regex
            // IMPORTANT: Keep the database ID if the session pattern has one
            mergedPatterns[existingIndex] = { 
              ...mergedPatterns[existingIndex], 
              id: sessionPattern.id, // Use the database ID from the saved pattern
              examples: [...sessionPattern.examples], // Create new array to avoid reference issues
              existingExamples: [...sessionPattern.examples], // Mark these as existing
              regex: sessionPattern.regex,
              regexPatterns: sessionPattern.regexPatterns
            };
          } else {
            // Add as new pattern due to type mismatch
            mergedPatterns.unshift({
              ...sessionPattern,
              id: `session-${sessionPattern.id}`, // Ensure unique ID
              existingExamples: [...sessionPattern.examples] // Mark these as existing
            });
          }
        } else {
          // Add custom patterns that don't exist in predefined list
          mergedPatterns.unshift({
            ...sessionPattern,
            existingExamples: [...sessionPattern.examples] // Mark these as existing
          });
        }
      });
      
      // Remove duplicate patterns by label (keep the one with correct examples)
      const uniquePatterns = [];
      const seenLabels = new Set();
      
      for (const pattern of mergedPatterns) {
        if (!seenLabels.has(pattern.label)) {
          uniquePatterns.push(pattern);
          seenLabels.add(pattern.label);
        } else {
        }
      }
      
      setPatterns(uniquePatterns);
    } else {
      // Use default patterns for new sessions
      setPatterns(defaultPatterns);
    }
  }, [initialPatterns]);


  // Keyboard navigation for documents
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target && (e.target as HTMLElement).tagName === 'INPUT') return; // Don't trigger when typing
      
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

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim()) {
      setSelectedText(selection.toString().trim());
    }
  };

  const addExample = () => {
    if (!selectedText || !selectedPatternId) return;

    setPatterns(patterns.map(pattern => {
      if (pattern.id === selectedPatternId) {
        const newExamples = [...pattern.examples, selectedText];
        
        // Try to learn regex from all examples
        let newRegex = pattern.regex;
        let newRegexPatterns = pattern.regexPatterns;
        
        try {
          // Use pattern learning service if available
          if (typeof PatternLearningService !== 'undefined' && PatternLearningService.learnMultiplePatterns) {
            const learnedPatterns = PatternLearningService.learnMultiplePatterns(newExamples);
            if (learnedPatterns.length > 0) {
              newRegex = learnedPatterns[0].regex;
              newRegexPatterns = learnedPatterns.map(lp => lp.regex);
            }
          }
        } catch (error) {
          console.error('Error learning pattern from examples:', error);
        }
        
        return { 
          ...pattern, 
          examples: newExamples,
          regex: newRegex,
          regexPatterns: newRegexPatterns
          // Don't add to existingExamples - new examples stay as "new"
        };
      }
      return pattern;
    }));

    setSelectedText('');
    setSelectedPatternId('');
    window.getSelection()?.removeAllRanges();
  };

  const removeExample = (patternId: string, exampleIndex: number) => {
    setPatterns(patterns.map(pattern => {
      if (pattern.id === patternId) {
        const newExamples = pattern.examples.filter((_, i) => i !== exampleIndex);
        
        // Regenerate regex from remaining examples
        let newRegex = pattern.regex;
        let newRegexPatterns = pattern.regexPatterns;
        
        if (newExamples.length > 0) {
          try {
            const learnedPatterns = PatternLearningService.learnMultiplePatterns(newExamples);
            if (learnedPatterns.length > 0) {
              newRegex = learnedPatterns[0].regex;
              newRegexPatterns = learnedPatterns.map(lp => lp.regex);
            }
          } catch (error) {
            console.error('Error regenerating pattern from examples:', error);
          }
        } else {
          // No examples left, clear regex
          newRegex = undefined;
          newRegexPatterns = undefined;
        }
        
        return { ...pattern, examples: newExamples, regex: newRegex, regexPatterns: newRegexPatterns };
      }
      return pattern;
    }));
  };

  const addCustomPattern = () => {
    if (!customLabel.trim()) return;

    const newPattern: SensitivePattern = {
      id: `custom-${Date.now()}`,
      label: customLabel,
      color: 'bg-blue-100 text-blue-900',
      type: 'CUSTOM',
      examples: [],
    };

    setPatterns([newPattern, ...patterns]);
    setCustomLabel('');
    setShowCustomForm(false);
  };

  const removePattern = (patternId: string) => {
    setPatterns(patterns.filter(pattern => pattern.id !== patternId));
  };

  const handleContinue = () => {
    const patternsWithExamples = patterns.filter(pattern => pattern.examples.length > 0);
    onPatternsIdentified(patternsWithExamples);
  };

  // Handle feedback submission
  const handleFeedback = async (type: FeedbackType) => {
    if (!feedbackUI) return;

    console.log('Submitting feedback:', {
      patternId: feedbackUI.patternId,
      patternLabel: feedbackUI.patternLabel,
      feedbackType: type,
      matchedText: feedbackUI.matchedText,
    });

    try {
      const response = await fetch('/api/patterns/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patternId: feedbackUI.patternId,
          feedbackType: type,
          context: 'annotation',
          matchedText: feedbackUI.matchedText,
          originalConfidence: feedbackUI.confidence,
          dataSourceId: data[currentDocumentIndex]?.id,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Feedback submission failed:', error);
        throw new Error(`Failed to submit feedback: ${response.status} ${response.statusText}`);
      }

      showToast(
        'success',
        type === 'positive' 
          ? 'Thank you! Your feedback helps improve pattern detection.' 
          : 'Thank you! We\'ll work on improving this pattern.'
      );
      
      // Refresh refined patterns to get updated exclusions
      const refined = await RefinedPatternClient.getAllRefinedPatterns();
      setRefinedPatterns(refined);
      
      // Force re-highlight with new exclusions
      const content = data[currentDocumentIndex]?.content;
      if (content) {
        const highlighted = await highlightWithRefinedPatterns(content);
        setHighlightedContent(prev => ({
            ...prev,
            [currentDocumentIndex]: highlighted
          }));
        }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      showToast('error', error instanceof Error ? error.message : 'Failed to submit feedback. Please try again.');
    }
  };

  // Handle click on highlighted text to show feedback UI
  const handleHighlightClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    
    // Check if clicked element is a highlight
    if (target.classList.contains('highlight-annotation')) {
      const patternLabel = target.getAttribute('data-pattern');
      const matchedText = target.textContent || '';
      const confidence = parseFloat(target.getAttribute('data-confidence') || '1');
      
      // Find the pattern by label
      const pattern = patterns.find(p => p.label === patternLabel);
      console.log('Highlight clicked:', {
        patternLabel,
        foundPattern: pattern,
        patternId: pattern?.id,
        allPatterns: patterns.map(p => ({ id: p.id, label: p.label }))
      });
      
      if (pattern) {
        // Only show feedback UI for patterns that exist in the database
        // Client-side patterns (pattern-X or custom-X) haven't been saved yet
        const isPersistedPattern = !pattern.id.startsWith('pattern-') && !pattern.id.startsWith('custom-');
        console.log('Pattern persistence check:', {
          patternId: pattern.id,
          isPersistedPattern,
          shouldShowFeedback: isPersistedPattern
        });
        
        if (isPersistedPattern) {
          // Get position for feedback UI
          const rect = target.getBoundingClientRect();
          setFeedbackUI({
            patternId: pattern.id,
            patternLabel: pattern.label,
            matchedText,
            confidence,
            position: {
              x: rect.left + rect.width / 2 - 100, // Center the feedback UI
              y: rect.top
            }
          });
          console.log('Feedback UI set:', feedbackUI);
        } else {
          console.log('Pattern feedback only available for saved patterns. This pattern is still being created.');
        }
      } else {
        console.log('Pattern not found for label:', patternLabel);
      }
    }
  };

  // Helper function to build highlighted HTML from matches
  const buildHighlightedHtml = useCallback((content: string, matches: Array<{text: string, start: number, end: number, pattern: SensitivePattern | RefinedPattern, confidence: number}>) => {
    // Sort matches by position (descending) to avoid index shifts
    matches.sort((a, b) => b.start - a.start);

    let result = content;
    const escapeHtml = (text: string) => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };

    for (const match of matches) {
      const beforeText = result.substring(0, match.start);
      const afterText = result.substring(match.end);
      const escapedMatchText = escapeHtml(match.text);
      
      const isPersistedPattern = !match.pattern.id.startsWith('pattern-') && !match.pattern.id.startsWith('custom-');
      const tooltip = isPersistedPattern 
        ? `Pattern: ${escapeHtml(match.pattern.label)} (${Math.round(match.confidence * 100)}% confidence) - Click for feedback`
        : `Pattern: ${escapeHtml(match.pattern.label)} (${Math.round(match.confidence * 100)}% confidence) - Save pattern to enable feedback`;
      
      const highlightSpan = `<span class="highlight-annotation ${match.pattern.color} px-1 rounded cursor-pointer font-medium border border-opacity-30 hover:opacity-80 transition-opacity" style="border-color: currentColor;" title="${tooltip}" data-pattern="${escapeHtml(match.pattern.label)}" data-pattern-id="${match.pattern.id}" data-confidence="${match.confidence}">${escapedMatchText}</span>`;
      
      result = beforeText + highlightSpan + afterText;
    }

    return result;
  }, []);

  // Function to highlight with refined patterns (including exclusions)
  const highlightWithRefinedPatterns = useCallback(async (content: string) => {
    try {
      // Use refined patterns for database patterns, regular patterns for others
      const patternsToUse = patterns.map(pattern => {
        const refined = refinedPatterns.find(rp => rp.id === pattern.id);
        if (refined) {
          return {
            ...pattern,
            excludedExamples: refined.excludedExamples,
            confidenceThreshold: refined.confidenceThreshold
          };
        }
        return { ...pattern, excludedExamples: [], confidenceThreshold: 0.7 };
      });

      // Find matches using refined pattern service
      const refinedPatternsForMatching = patternsToUse.map(p => ({
        id: p.id,
        label: p.label,
        regex: p.regex,
        examples: p.examples,
        excludedExamples: p.excludedExamples || [],
        confidenceThreshold: p.confidenceThreshold || 0.7,
        color: p.color,
        type: p.type
      }));

      const matches = await RefinedPatternClient.findMatches(content, refinedPatternsForMatching);
      
      // Convert matches to highlight HTML using helper
      return buildHighlightedHtml(content, matches);
    } catch (error) {
      console.error('Error highlighting with refined patterns:', error);
      // Return original content as fallback
      return content;
    }
  }, [patterns, refinedPatterns, buildHighlightedHtml]);

  // Function to highlight annotated text in the document using simple pattern matching
  const highlightAnnotatedText = useCallback((content: string) => {
    const highlights: Array<{start: number, end: number, pattern: SensitivePattern, text: string, confidence: number}> = [];

    // Debug logging
    console.log('=== HIGHLIGHTING DEBUG ===');
    console.log('Content length:', content.length);
    console.log('Content preview:', content.substring(0, 200));
    console.log('Patterns to test:', patterns.map(p => ({
      id: p.id,
      label: p.label,
      regex: p.regex,
      regexPatterns: p.regexPatterns,
      examples: p.examples,
      hasExamples: p.examples.length > 0
    })));

    // Use simple pattern matching for real-time highlighting (no ML for performance)
    for (const pattern of patterns) {
      // First, try regex if available
      if (pattern.regex) {
        try {
          console.log(`Testing regex for ${pattern.label}: ${pattern.regex}`);
          const regex2 = new RegExp(pattern.regex, 'gi');
          let match: RegExpExecArray | null;
          let matchCount = 0;
          const allMatches: string[] = [];
          
          // Reset regex to ensure we start from beginning
          regex2.lastIndex = 0;
          
          while ((match = regex2.exec(content)) !== null) {
            matchCount++;
            const matchIndex = match.index;
            const matchLength = match[0].length;
            const matchEnd = matchIndex + matchLength;
            allMatches.push(`'${match[0]}' at ${matchIndex}-${matchEnd}`);
            
            // Check for exact duplicate (same pattern, same position)
            const isDuplicate = highlights.some(h => 
              h.pattern.id === pattern.id && 
              h.start === matchIndex && 
              h.end === matchEnd
            );
            
            if (!isDuplicate) {
              highlights.push({
                start: matchIndex,
                end: matchEnd,
                pattern,
                text: match[0],
                confidence: 0.95
              });
              console.log(`  Added highlight: '${match[0]}' at position ${matchIndex}`);
            } else {
              console.log(`  Skipped duplicate: '${match[0]}' at position ${matchIndex}`);
            }
            
            // Safety check for infinite loops
            if (matchLength === 0) {
              regex2.lastIndex++;
            }
          }
          console.log(`Pattern '${pattern.label}' - Found ${matchCount} matches:`, allMatches);
          console.log(`  Added ${highlights.filter(h => h.pattern.id === pattern.id).length} highlights for this pattern`);
        } catch (error) {
          console.warn(`Invalid regex for pattern ${pattern.label}:`, error);
        }
      }

      // Also try multiple regex patterns if available
      if (pattern.regexPatterns && pattern.regexPatterns.length > 0) {
        console.log(`\nTesting ${pattern.regexPatterns.length} regex patterns for ${pattern.label}:`);
        for (let i = 0; i < pattern.regexPatterns.length; i++) {
          const regexPattern = pattern.regexPatterns[i];
          console.log(`  Pattern ${i + 1}: ${regexPattern}`);
          try {
            const regex = new RegExp(regexPattern, 'gi'); // Added 'i' flag for case-insensitive
            let match: RegExpExecArray | null;
            let patternMatchCount = 0;
            while ((match = regex.exec(content)) !== null) {
              patternMatchCount++;
              const matchIndex = match.index;
              const matchLength = match[0].length;
              const matchEnd = matchIndex + matchLength;
              
              // Check for exact duplicate (same pattern, same position)
              const isDuplicate = highlights.some(h => 
                h.pattern.id === pattern.id && 
                h.start === matchIndex && 
                h.end === matchEnd
              );
              
              if (!isDuplicate) {
                highlights.push({
                  start: matchIndex,
                  end: matchEnd,
                  pattern,
                  text: match[0],
                  confidence: 0.95
                });
                console.log(`    Added match: '${match[0]}' at ${matchIndex}`);
              }
            }
            console.log(`  Pattern ${i + 1} found ${patternMatchCount} matches`);
          } catch (error) {
            console.warn(`Invalid regex pattern for ${pattern.label}:`, error);
          }
        }
      }

      // Then try examples
      if (pattern.examples.length === 0) continue;

      // Simple exact and case-insensitive matching for real-time highlighting
      pattern.examples.forEach(example => {
        if (!example.trim()) return;
        
        // Exact matches
        let searchIndex = 0;
        while (true) {
          const index = content.indexOf(example, searchIndex);
          if (index === -1) break;
          
          const endIndex = index + example.length;
          
          // Check for exact duplicate (same pattern, same position)
          const isDuplicate = highlights.some(h => 
            h.pattern.id === pattern.id && 
            h.start === index && 
            h.end === endIndex
          );
          
          if (!isDuplicate) {
            highlights.push({
              start: index,
              end: endIndex,
              pattern,
              text: content.substring(index, endIndex),
              confidence: 1.0
            });
          }
          searchIndex = index + 1;
        }
        
        // Case-insensitive matches (only if different from exact)
        const lowerContent = content.toLowerCase();
        const lowerExample = example.toLowerCase();
        if (example !== lowerExample) {
          searchIndex = 0;
          while (true) {
            const index = lowerContent.indexOf(lowerExample, searchIndex);
            if (index === -1) break;
            
            const actualText = content.substring(index, index + example.length);
            const endIndex = index + example.length;
            
            // Check for exact duplicate (same pattern, same position)
            const isDuplicate = highlights.some(h => 
              h.pattern.id === pattern.id && 
              h.start === index && 
              h.end === endIndex
            );
            
            if (!isDuplicate && actualText !== example) { // Don't duplicate exact matches
              highlights.push({
                start: index,
                end: endIndex,
                pattern,
                text: actualText,
                confidence: 0.9
              });
            }
            searchIndex = index + 1;
          }
        }
      });
    }

    console.log(`\nTotal highlights found: ${highlights.length}`);
    console.log('Highlights by pattern:', 
      patterns.filter(p => p.examples.length > 0 || p.regex).map(p => ({
        pattern: p.label,
        count: highlights.filter(h => h.pattern.id === p.id).length
      }))
    );
    
    // Final debug - count highlights
    console.log(`\nTotal highlights found: ${highlights.length}`);
    
    // Use the helper function to build HTML
    return buildHighlightedHtml(content, highlights);
  }, [patterns, buildHighlightedHtml]);

  // Function to run ML-based pattern detection
  const runMLDetection = useCallback(async () => {
    if (!data[currentDocumentIndex]?.content || patterns.length === 0) return;
    
    setIsRunningML(true);
    setShowMLHighlights(true);
    
    try {
      const content = data[currentDocumentIndex].content;
      const highlights: Array<{start: number, end: number, pattern: SensitivePattern, text: string, confidence: number}> = [];

      // Use ML pattern testing for each pattern
      for (const pattern of patterns) {
        if (pattern.examples.length === 0) continue;

        try {
          // Convert SensitivePattern to Pattern format expected by patternTestingService
          const testPattern = {
            id: pattern.id,
            name: pattern.label,
            type: pattern.type,
            category: pattern.label,
            regex: '', // Will be auto-generated from examples
            examples: pattern.examples,
            description: `Pattern for ${pattern.label}`,
            color: pattern.color,
            isActive: true,
            createdAt: new Date()
          };

          // Test the pattern against the content with ML and fuzzy matching enabled
          const testResult = await patternTestingService.testPatternWithML(content, testPattern, undefined, true);
          
          // Add all matches from the test result
          testResult.matches.forEach(match => {
            // Check for overlaps with existing highlights
            const overlaps = highlights.some(h => 
              (match.startIndex < h.end && match.endIndex > h.start)
            );
            
            if (!overlaps) {
              highlights.push({
                start: match.startIndex,
                end: match.endIndex,
                pattern,
                text: match.value,
                confidence: match.confidence || 0.8 // Default confidence if not provided
              });
            }
          });
        } catch (error) {
          console.error(`Error testing pattern ${pattern.label} with ML:`, error);
        }
      }

      // Sort highlights by start position (descending)
      highlights.sort((a, b) => b.start - a.start);

      // Apply the same HTML escaping and highlighting logic
      const escapeHtml = (text: string): string => {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      };

      // Build the highlighted HTML
      let result = '';
      let lastEnd = content.length;
      
      for (const highlight of highlights) {
        const afterText = content.substring(highlight.end, lastEnd);
        const escapedAfterText = escapeHtml(afterText);
        
        const highlightedText = escapeHtml(highlight.text);
        const confidencePercent = Math.round((highlight.confidence || 1) * 100);
        const highlightSpan = `<span class="annotation-highlight ${highlight.pattern.color}" data-pattern="${escapeHtml(highlight.pattern.label)}" title="${escapeHtml(highlight.pattern.label)} (${confidencePercent}% confidence)">${highlightedText}</span>`;
        
        result = highlightSpan + escapedAfterText + result;
        lastEnd = highlight.start;
      }
      
      if (lastEnd > 0) {
        const beforeText = content.substring(0, lastEnd);
        const escapedBeforeText = escapeHtml(beforeText);
        result = escapedBeforeText + result;
      }

      setMlHighlightedContent(prev => ({
        ...prev,
        [currentDocumentIndex]: result
      }));
    } catch (error) {
      console.error('Error running ML detection:', error);
    } finally {
      setIsRunningML(false);
    }
  }, [data, currentDocumentIndex, patterns]);

  // Update highlighted content when patterns change or document changes
  useEffect(() => {
    const updateHighlighting = async () => {
      if (data[currentDocumentIndex]?.content) {
        try {
          console.log('\n=== useEffect HIGHLIGHTING UPDATE ===');
          console.log('Current document index:', currentDocumentIndex);
          console.log('Document name:', data[currentDocumentIndex].name);
          console.log('Content length:', data[currentDocumentIndex].content.length);
          console.log('Active patterns with examples:', patterns.filter(p => p.examples.length > 0).map(p => ({
            label: p.label,
            exampleCount: p.examples.length,
            regex: p.regex
          })));
          console.log('Refined patterns available:', refinedPatterns.length);
          
          // Use refined pattern highlighting if we have database patterns
          const hasDbPatterns = patterns.some(p => !p.id.startsWith('pattern-') && !p.id.startsWith('custom-'));
          let highlighted: string;
          
          if (hasDbPatterns && refinedPatterns.length > 0) {
            highlighted = await highlightWithRefinedPatterns(data[currentDocumentIndex].content);
            console.log('Using refined pattern highlighting with exclusions');
          } else {
            highlighted = highlightAnnotatedText(data[currentDocumentIndex].content);
            console.log('Using basic pattern highlighting');
          }
          
          // Count actual highlight spans in the result
          const highlightCount = (highlighted.match(/<span class="highlight-annotation/g) || []).length;
          console.log('Highlight spans in result HTML:', highlightCount);
          
          setHighlightedContent(prev => ({
            ...prev,
            [currentDocumentIndex]: highlighted
          }));
        } catch (error) {
          console.error('Error highlighting content:', error);
          // Fallback to original content
          setHighlightedContent(prev => ({
            ...prev,
            [currentDocumentIndex]: data[currentDocumentIndex].content
          }));
        }
      }
      // Reset ML highlights when document changes
      setShowMLHighlights(false);
    };
    
    updateHighlighting();
  }, [patterns, currentDocumentIndex, data, refinedPatterns, highlightAnnotatedText, highlightWithRefinedPatterns]);

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
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Select Document:</h4>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {data.map((file, index) => (
                  <button
                    key={file.id}
                    onClick={() => setCurrentDocumentIndex(index)}
                    className={`w-full text-left px-3 py-2 rounded text-sm transition-colors ${
                      index === currentDocumentIndex
                        ? 'bg-blue-600 text-white font-medium'
                        : 'bg-white text-blue-900 hover:bg-blue-100 border border-blue-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate flex-1 mr-2">{file.name}</span>
                      <span className="text-xs opacity-75">
                        {(file.size / 1024).toFixed(1)}KB
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {data[currentDocumentIndex] && (
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-blue-900 truncate mr-2" title={data[currentDocumentIndex].name}>
                  {data[currentDocumentIndex].name}
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
                  {data[currentDocumentIndex].type !== 'application/json' && (
                    <button
                      onClick={() => setShowFullText(true)}
                      className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded hover:bg-purple-200 transition-colors"
                    >
                      View Full Text
                    </button>
                  )}
                  {data[currentDocumentIndex].contentTruncated && (
                    <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded flex-shrink-0">
                      Truncated
                    </span>
                  )}
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded flex-shrink-0">
                    {data[currentDocumentIndex].type}
                  </span>
                </div>
              </div>
              
              {data[currentDocumentIndex].contentTruncated && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3">
                  <p className="text-sm text-orange-800">
                    <strong>⚠️ Content Truncated:</strong> This document was truncated for storage efficiency. 
                    Showing {data[currentDocumentIndex].content.length.toLocaleString()} of {data[currentDocumentIndex].originalContentLength?.toLocaleString()} characters.
                    {data[currentDocumentIndex].type === 'application/pdf' && (
                      <span> Use &ldquo;View Full Text&rdquo; to see what&apos;s available.</span>
                    )}
                  </p>
                </div>
              )}
              
              <div
                ref={contentRef}
                className="text-sm text-gray-900 whitespace-pre-wrap select-text cursor-text bg-white p-4 rounded border-2 border-gray-200 hover:border-blue-300 transition-colors shadow-sm min-h-[600px] max-h-[80vh] overflow-y-auto"
                onMouseUp={handleTextSelection}
                onClick={handleHighlightClick}
                dangerouslySetInnerHTML={{
                  __html: showMLHighlights && mlHighlightedContent[currentDocumentIndex] 
                    ? mlHighlightedContent[currentDocumentIndex]
                    : highlightedContent[currentDocumentIndex] || data[currentDocumentIndex].content
                }}
              />
            </div>
          )}
        </div>

        {/* Annotation Panel */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Sensitive Data Patterns</h3>
            <button
              onClick={() => setShowCustomForm(true)}
              className="flex items-center text-blue-600 hover:text-blue-700 text-sm"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Custom
            </button>
          </div>

          {selectedText && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-semibold text-blue-900 mb-2">Selected text:</p>
              <p className="font-mono text-sm bg-white p-3 rounded border text-gray-900 font-medium">{selectedText}</p>
              <div className="mt-3 space-y-2">
                <label className="block text-sm font-semibold text-blue-900">
                  Tag as:
                </label>
                <select
                  value={selectedPatternId}
                  onChange={(e) => setSelectedPatternId(e.target.value)}
                  className="block w-full rounded border-gray-300 text-gray-900 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select a pattern type...</option>
                  {patterns.map(pattern => (
                    <option key={pattern.id} value={pattern.id}>{pattern.label}</option>
                  ))}
                </select>
                <button
                  onClick={addExample}
                  disabled={!selectedPatternId}
                  className="w-full px-3 py-2 bg-blue-900 text-white text-sm font-semibold rounded hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Add Example
                </button>
              </div>
            </div>
          )}

          {showCustomForm && (
            <div className="p-3 bg-gray-50 border rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Add Custom Pattern</h4>
              <input
                type="text"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="Pattern name (e.g., Employee ID)"
                className="block w-full rounded border-gray-300 text-gray-900 bg-white px-3 py-2 text-sm mb-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <div className="flex space-x-2">
                <button
                  onClick={addCustomPattern}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setShowCustomForm(false);
                    setCustomLabel('');
                  }}
                  className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {patterns.map(pattern => (
              <div key={pattern.id} className="border rounded-lg p-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center space-x-2 flex-1">
                    <Tag className="h-4 w-4 text-gray-400" />
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${pattern.color}`}>
                      {pattern.label}
                    </span>
                    {pattern.examples.length > 0 && (
                      <PatternAccuracyBadge patternId={pattern.id} patternLabel={pattern.label} />
                    )}
                  </div>
                  {pattern.type === 'CUSTOM' && (
                    <button
                      onClick={() => removePattern(pattern.id)}
                      className="text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                
                {pattern.examples.length > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-blue-900">Examples:</p>
                      {pattern.existingExamples && pattern.existingExamples.length > 0 && (
                        <p className="text-xs text-green-600">
                          {pattern.existingExamples.length} existing
                        </p>
                      )}
                    </div>
                    {pattern.examples.map((example, idx) => {
                      const isExisting = pattern.existingExamples?.includes(example);
                      return (
                        <div key={idx} className={`flex items-center justify-between p-1 rounded text-xs ${
                          isExisting 
                            ? 'bg-green-50 border border-green-200' 
                            : 'bg-white border border-blue-100'
                        }`}>
                          <div className="flex items-center gap-2">
                            <code className="font-mono text-gray-900 font-medium">{example}</code>
                            {isExisting && (
                              <span className="text-green-600 text-xs bg-green-100 px-1 rounded">existing</span>
                            )}
                          </div>
                          <button
                            onClick={() => removeExample(pattern.id, idx)}
                            className="text-red-500 hover:text-red-700 ml-2"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {pattern.examples.length === 0 && (
                  <p className="text-xs text-gray-500 italic">No examples added yet</p>
                )}
                
                {/* Show feedback stats if pattern has been used */}
                {pattern.examples.length > 0 && (
                  <FeedbackStats patternId={pattern.id} />
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={handleContinue}
              disabled={!patterns.some(p => p.examples.length > 0)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {continueButtonText}
            </button>
          </div>
        </div>
      </div>

      {/* Full Text Modal */}
      {showFullText && data[currentDocumentIndex] && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4"
             onClick={(e) => {
               if (e.target === e.currentTarget) {
                 setShowFullText(false);
               }
             }}>
          <div className="bg-white rounded-lg border-2 border-gray-600 w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Full Text Content</h2>
                <p className="text-sm text-gray-600 mt-1">{data[currentDocumentIndex].name}</p>
              </div>
              <button
                onClick={() => setShowFullText(false)}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {data[currentDocumentIndex].contentTruncated ? (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
                  <p className="text-sm text-orange-800">
                    <strong>⚠️ Content Truncated:</strong> This PDF content was truncated for storage efficiency. 
                    Showing {data[currentDocumentIndex].content.length.toLocaleString()} characters of {data[currentDocumentIndex].originalContentLength?.toLocaleString()} total characters.
                    The visible content may not include all sensitive data from the original document.
                  </p>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-700">
                    <strong>💡 Tip:</strong> This shows the complete text content extracted from your PDF. 
                    You can select text here and it will be applied to the main annotation view.
                  </p>
                </div>
              )}
              <div
                className="text-sm text-gray-900 whitespace-pre-wrap select-text cursor-text bg-white p-4 rounded border border-gray-200 min-h-[500px]"
                onMouseUp={handleTextSelection}
                dangerouslySetInnerHTML={{
                  __html: highlightedContent[currentDocumentIndex] || data[currentDocumentIndex].content
                }}
              />
            </div>
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Content length: {data[currentDocumentIndex].content.length.toLocaleString()} characters
              </div>
              <button
                onClick={() => setShowFullText(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback UI */}
      {feedbackUI && (
        <FeedbackButtons
          patternId={feedbackUI.patternId}
          patternLabel={feedbackUI.patternLabel}
          matchedText={feedbackUI.matchedText}
          confidence={feedbackUI.confidence}
          position={feedbackUI.position}
          onClose={() => setFeedbackUI(null)}
          onFeedback={handleFeedback}
        />
      )}
    </div>
  );
}