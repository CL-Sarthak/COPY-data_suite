import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDataAnnotation } from '../useDataAnnotation';
import { DataAnnotationService } from '@/services/dataAnnotationService';
import { ToastProvider } from '@/contexts/ToastContext';
import { FileData, SensitivePattern } from '@/types';

// Mock services
jest.mock('@/services/dataAnnotationService');

// Mock toast context
jest.mock('@/contexts/ToastContext', () => ({
  ...jest.requireActual('@/contexts/ToastContext'),
  useToast: () => ({
    showToast: {
      success: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
      warning: jest.fn()
    }
  })
}));

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastProvider>{children}</ToastProvider>
);

describe('useDataAnnotation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    (DataAnnotationService.initializePatterns as jest.Mock).mockReturnValue([
      {
        id: 'pattern-1',
        label: 'SSN',
        color: 'bg-red-100 text-red-800',
        type: 'PII',
        examples: []
      }
    ]);
    
    (DataAnnotationService.loadRefinedPatterns as jest.Mock).mockResolvedValue([]);
    (DataAnnotationService.findPatternMatches as jest.Mock).mockResolvedValue([]);
    (DataAnnotationService.applyHighlighting as jest.Mock).mockImplementation((text) => text);
  });

  const mockData: FileData[] = [
    { name: 'test1.txt', content: 'This is test content with SSN 123-45-6789' },
    { name: 'test2.txt', content: 'Another file with email test@example.com' }
  ];

  const mockOnPatternsIdentified = jest.fn();

  it('should initialize with default state', async () => {
    const { result } = renderHook(
      () => useDataAnnotation({ 
        data: mockData, 
        onPatternsIdentified: mockOnPatternsIdentified 
      }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.patterns).toHaveLength(1);
    });

    expect(result.current.selectedText).toBe('');
    expect(result.current.selectedPatternId).toBe('');
    expect(result.current.currentDocumentIndex).toBe(0);
    expect(result.current.showFullText).toBe(false);
    expect(result.current.isRunningML).toBe(false);
    expect(result.current.currentFile).toEqual(mockData[0]);
  });

  it('should initialize patterns from initialPatterns', async () => {
    const initialPatterns: SensitivePattern[] = [
      {
        id: 'db-123',
        label: 'Email',
        color: 'bg-blue-100 text-blue-800',
        type: 'PII',
        examples: ['test@example.com']
      }
    ];

    (DataAnnotationService.initializePatterns as jest.Mock).mockReturnValue(initialPatterns);

    const { result } = renderHook(
      () => useDataAnnotation({ 
        data: mockData, 
        onPatternsIdentified: mockOnPatternsIdentified,
        initialPatterns 
      }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.patterns).toEqual(initialPatterns);
    });

    expect(DataAnnotationService.initializePatterns).toHaveBeenCalledWith(initialPatterns);
  });

  it('should handle text selection', () => {
    const { result } = renderHook(
      () => useDataAnnotation({ 
        data: mockData, 
        onPatternsIdentified: mockOnPatternsIdentified 
      }),
      { wrapper }
    );

    // Mock window.getSelection
    const mockSelection = {
      toString: () => '123-45-6789',
      removeAllRanges: jest.fn()
    };
    
    global.window.getSelection = jest.fn(() => mockSelection as any);

    act(() => {
      result.current.handleTextSelection();
    });

    expect(result.current.selectedText).toBe('123-45-6789');
  });

  it('should navigate between documents', async () => {
    const { result } = renderHook(
      () => useDataAnnotation({ 
        data: mockData, 
        onPatternsIdentified: mockOnPatternsIdentified 
      }),
      { wrapper }
    );

    expect(result.current.currentDocumentIndex).toBe(0);
    expect(result.current.isFirstDocument).toBe(true);
    expect(result.current.isLastDocument).toBe(false);

    act(() => {
      result.current.setCurrentDocumentIndex(1);
    });

    expect(result.current.currentDocumentIndex).toBe(1);
    expect(result.current.isFirstDocument).toBe(false);
    expect(result.current.isLastDocument).toBe(true);
    expect(result.current.currentFile).toEqual(mockData[1]);
  });

  it('should add example to pattern', async () => {
    (DataAnnotationService.addExampleToPattern as jest.Mock).mockReturnValue({
      id: 'pattern-1',
      label: 'SSN',
      color: 'bg-red-100 text-red-800',
      type: 'PII',
      examples: ['123-45-6789']
    });

    const { result } = renderHook(
      () => useDataAnnotation({ 
        data: mockData, 
        onPatternsIdentified: mockOnPatternsIdentified 
      }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.patterns).toHaveLength(1);
    });

    act(() => {
      result.current.setSelectedText('123-45-6789');
      result.current.setSelectedPatternId('pattern-1');
    });

    act(() => {
      result.current.addExample();
    });

    expect(DataAnnotationService.addExampleToPattern).toHaveBeenCalled();
    expect(result.current.selectedText).toBe('');
    expect(result.current.selectedPatternId).toBe('');
  });

  it('should not add example without selected text or pattern', () => {
    const { result } = renderHook(
      () => useDataAnnotation({ 
        data: mockData, 
        onPatternsIdentified: mockOnPatternsIdentified 
      }),
      { wrapper }
    );

    act(() => {
      result.current.addExample();
    });

    expect(DataAnnotationService.addExampleToPattern).not.toHaveBeenCalled();
  });

  it('should remove example from pattern', async () => {
    const patternWithExample: SensitivePattern = {
      id: 'pattern-1',
      label: 'SSN',
      color: 'bg-red-100 text-red-800',
      type: 'PII',
      examples: ['123-45-6789', '987-65-4321']
    };

    (DataAnnotationService.initializePatterns as jest.Mock).mockReturnValue([patternWithExample]);
    (DataAnnotationService.removeExampleFromPattern as jest.Mock).mockReturnValue({
      ...patternWithExample,
      examples: ['123-45-6789']
    });

    const { result } = renderHook(
      () => useDataAnnotation({ 
        data: mockData, 
        onPatternsIdentified: mockOnPatternsIdentified 
      }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.patterns[0].examples).toHaveLength(2);
    });

    act(() => {
      result.current.removeExample('pattern-1', 1);
    });

    expect(DataAnnotationService.removeExampleFromPattern).toHaveBeenCalledWith(
      patternWithExample,
      1
    );
  });

  it('should add custom pattern', async () => {
    const customPattern = {
      id: 'custom-123',
      label: 'Employee ID',
      color: 'bg-blue-100 text-blue-900',
      type: 'CUSTOM',
      examples: []
    };

    (DataAnnotationService.createCustomPattern as jest.Mock).mockReturnValue(customPattern);

    const { result } = renderHook(
      () => useDataAnnotation({ 
        data: mockData, 
        onPatternsIdentified: mockOnPatternsIdentified 
      }),
      { wrapper }
    );

    act(() => {
      result.current.setCustomLabel('Employee ID');
    });

    act(() => {
      result.current.addCustomPattern();
    });

    expect(DataAnnotationService.createCustomPattern).toHaveBeenCalledWith('Employee ID');
    expect(result.current.customLabel).toBe('');
    expect(result.current.showCustomForm).toBe(false);
  });

  it('should not add custom pattern with empty label', () => {
    const { result } = renderHook(
      () => useDataAnnotation({ 
        data: mockData, 
        onPatternsIdentified: mockOnPatternsIdentified 
      }),
      { wrapper }
    );

    act(() => {
      result.current.setCustomLabel('   ');
      result.current.addCustomPattern();
    });

    expect(DataAnnotationService.createCustomPattern).not.toHaveBeenCalled();
  });

  it('should remove pattern', async () => {
    const patterns: SensitivePattern[] = [
      { id: 'pattern-1', label: 'SSN', color: '', type: 'PII', examples: [] },
      { id: 'custom-1', label: 'Custom', color: '', type: 'CUSTOM', examples: [] }
    ];

    (DataAnnotationService.initializePatterns as jest.Mock).mockReturnValue(patterns);

    const { result } = renderHook(
      () => useDataAnnotation({ 
        data: mockData, 
        onPatternsIdentified: mockOnPatternsIdentified 
      }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.patterns).toHaveLength(2);
    });

    act(() => {
      result.current.removePattern('custom-1');
    });

    expect(result.current.patterns).toHaveLength(1);
    expect(result.current.patterns[0].id).toBe('pattern-1');
  });

  it('should handle continue with patterns that have examples', async () => {
    const patterns: SensitivePattern[] = [
      { id: '1', label: 'SSN', color: '', type: 'PII', examples: ['123-45-6789'] },
      { id: '2', label: 'Email', color: '', type: 'PII', examples: [] },
      { id: '3', label: 'Phone', color: '', type: 'PII', examples: ['555-1234'] }
    ];

    (DataAnnotationService.initializePatterns as jest.Mock).mockReturnValue(patterns);
    (DataAnnotationService.getPatternsWithExamples as jest.Mock).mockReturnValue([
      patterns[0],
      patterns[2]
    ]);

    const { result } = renderHook(
      () => useDataAnnotation({ 
        data: mockData, 
        onPatternsIdentified: mockOnPatternsIdentified 
      }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.patterns).toHaveLength(3);
    });

    act(() => {
      result.current.handleContinue();
    });

    expect(DataAnnotationService.getPatternsWithExamples).toHaveBeenCalledWith(patterns);
    expect(mockOnPatternsIdentified).toHaveBeenCalledWith([patterns[0], patterns[2]]);
  });

  it('should run ML detection', async () => {
    const mlMatches = {
      0: [{ patternId: '1', matchedText: '123-45-6789', startIndex: 10, endIndex: 21 }],
      1: [{ patternId: '2', matchedText: 'test@example.com', startIndex: 20, endIndex: 36 }]
    };

    (DataAnnotationService.runMLDetection as jest.Mock).mockResolvedValue(mlMatches);

    const { result } = renderHook(
      () => useDataAnnotation({ 
        data: mockData, 
        onPatternsIdentified: mockOnPatternsIdentified 
      }),
      { wrapper }
    );

    expect(result.current.isRunningML).toBe(false);

    await act(async () => {
      await result.current.runMLDetection();
    });

    expect(DataAnnotationService.runMLDetection).toHaveBeenCalledWith(mockData, result.current.patterns);
    expect(result.current.showMLHighlights).toBe(true);
    expect(result.current.isRunningML).toBe(false);
  });

  it('should handle feedback', async () => {
    (DataAnnotationService.storeFeedback as jest.Mock).mockResolvedValue(undefined);
    (DataAnnotationService.loadRefinedPatterns as jest.Mock).mockResolvedValue([
      { pattern_id: '1', exclusions: ['123-45-6789'] }
    ]);

    const { result } = renderHook(
      () => useDataAnnotation({ 
        data: mockData, 
        onPatternsIdentified: mockOnPatternsIdentified 
      }),
      { wrapper }
    );

    act(() => {
      result.current.setFeedbackUI({
        patternId: 'pattern-1',
        patternLabel: 'SSN',
        matchedText: '123-45-6789',
        confidence: 0.9,
        position: { x: 100, y: 200 }
      });
    });

    await act(async () => {
      await result.current.handleFeedback('positive');
    });

    expect(DataAnnotationService.storeFeedback).toHaveBeenCalledWith(
      'pattern-1',
      'SSN',
      '123-45-6789',
      'positive'
    );
    expect(result.current.feedbackUI).toBeNull();
  });

  it('should apply highlighting when patterns change', async () => {
    const matches = [
      {
        patternId: '1',
        patternLabel: 'SSN',
        matchedText: '123-45-6789',
        startIndex: 10,
        endIndex: 21,
        confidence: 0.9,
        color: 'bg-red-100'
      }
    ];

    (DataAnnotationService.findPatternMatches as jest.Mock).mockResolvedValue(matches);
    (DataAnnotationService.applyHighlighting as jest.Mock).mockReturnValue(
      'Highlighted content'
    );

    const { result } = renderHook(
      () => useDataAnnotation({ 
        data: mockData, 
        onPatternsIdentified: mockOnPatternsIdentified 
      }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.highlightedContent[0]).toBe('Highlighted content');
    });

    expect(DataAnnotationService.findPatternMatches).toHaveBeenCalled();
    expect(DataAnnotationService.applyHighlighting).toHaveBeenCalledWith(
      mockData[0].content,
      matches
    );
  });
});