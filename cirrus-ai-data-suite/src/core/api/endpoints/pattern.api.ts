import { apiClient } from '../client';
import { Pattern } from '@/services/patternService';
import { SensitivePattern } from '@/types';

export interface CreatePatternRequest {
  name: string;
  type: string;
  description?: string;
  regex?: string[];
  examples?: string[];
  category?: string;
  isActive?: boolean;
  useML?: boolean;
  confidence_threshold?: number;
}

export interface UpdatePatternRequest extends Partial<CreatePatternRequest> {
  isActive?: boolean;
  examples?: string[];
}

export interface PatternTestRequest {
  pattern: string;
  testText: string;
}

export interface PatternTestResponse {
  matches: Array<{
    text: string;
    start: number;
    end: number;
  }>;
  matchCount: number;
}

export interface PatternFeedbackRequest {
  patternId: string;
  feedbackType: 'positive' | 'negative';
  matchedText: string;
  context?: string;
  reason?: string;
}

export interface RefinedPatternsResponse {
  patterns: Array<{
    id: string;
    name: string;
    exclusions?: string[];
    confidenceThreshold?: number;
  }>;
}

export interface PatternRefinementSuggestion {
  patternId: string;
  type: 'regex' | 'context' | 'examples' | 'confidence';
  currentValue: string | number | string[];
  suggestedValue: string | number | string[];
  reason: string;
  confidence: number;
}

export interface MLDetectionRequest {
  text: string;
}

export interface MLDetectionResponse {
  matches: Array<{
    text: string;
    type: string;
    start: number;
    end: number;
    confidence?: number;
  }>;
  provider?: string;
  configured: boolean;
}

export interface MLStatusResponse {
  isAvailable: boolean;
  isConfigured: boolean;
  provider?: string;
  model?: string;
  availableModels?: Array<{ provider: string; models: string[] }>;
}

export class PatternAPI {
  // Get all patterns
  async getPatterns(): Promise<Pattern[]> {
    return apiClient.get<Pattern[]>('/api/patterns');
  }

  // Get a single pattern
  async getPattern(id: string): Promise<Pattern> {
    return apiClient.get<Pattern>(`/api/patterns/${id}`);
  }

  // Create a new pattern
  async createPattern(data: CreatePatternRequest): Promise<Pattern> {
    return apiClient.post<Pattern>('/api/patterns', data);
  }

  // Update a pattern
  async updatePattern(id: string, data: UpdatePatternRequest): Promise<Pattern> {
    return apiClient.patch<Pattern>(`/api/patterns/${id}`, data);
  }

  // Toggle pattern active state
  async togglePattern(id: string, isActive: boolean): Promise<Pattern> {
    return apiClient.patch<Pattern>(`/api/patterns/${id}`, { isActive });
  }

  // Delete a pattern
  async deletePattern(id: string): Promise<void> {
    return apiClient.delete<void>(`/api/patterns/${id}`);
  }

  // Bulk create patterns from annotation
  async createPatternsFromAnnotation(patterns: SensitivePattern[]): Promise<void> {
    const promises = patterns.map(pattern => 
      this.createPattern({
        name: pattern.label || pattern.type,
        type: pattern.type,
        description: `Auto-detected ${pattern.type} pattern`,
        regex: pattern.regexPatterns || (pattern.regex ? [pattern.regex] : []),
        examples: pattern.examples || [],
        category: pattern.type,
        isActive: true,
        useML: false
      })
    );
    
    await Promise.all(promises);
  }

  // Get ML status
  async getMLStatus(): Promise<MLStatusResponse> {
    return apiClient.get<MLStatusResponse>('/api/ml/status');
  }

  // Test a pattern against text
  async testPattern(data: PatternTestRequest): Promise<PatternTestResponse> {
    return apiClient.post<PatternTestResponse>('/api/patterns/test', data);
  }

  // Submit pattern feedback
  async submitFeedback(data: PatternFeedbackRequest): Promise<{ success: boolean; feedback: PatternFeedbackRequest & { id: string }; message: string }> {
    return apiClient.post('/api/patterns/feedback', data);
  }

  // Get refined patterns
  async getRefinedPatterns(patternId?: string): Promise<RefinedPatternsResponse> {
    const url = patternId 
      ? `/api/patterns/refined?patternId=${patternId}`
      : '/api/patterns/refined';
    return apiClient.get(url);
  }

  // Get pattern refinement suggestions
  async getRefinementSuggestions(patternId: string): Promise<PatternRefinementSuggestion[]> {
    return apiClient.get(`/api/patterns/feedback/refinements?patternId=${patternId}`);
  }

  // Apply pattern refinement
  async applyRefinement(patternId: string, refinement: PatternRefinementSuggestion): Promise<{ success: boolean; pattern: Pattern; message: string }> {
    return apiClient.post('/api/patterns/feedback/refinements', { patternId, refinement });
  }

  // Perform ML detection
  async detectWithML(data: MLDetectionRequest): Promise<MLDetectionResponse> {
    return apiClient.post<MLDetectionResponse>('/api/ml/detect', data);
  }
}

export const patternAPI = new PatternAPI();