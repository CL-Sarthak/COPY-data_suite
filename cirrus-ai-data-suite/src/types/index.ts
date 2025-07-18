// Re-export commonly used types from their actual locations
export type { DataSource } from './discovery';
export type { Pattern } from '../services/patternService';

export interface FileData {
  id: string;
  name: string;
  type: string;
  size: number;
  content: string;
  contentTruncated?: boolean;
  originalContentLength?: number;
}

export interface SensitivePattern {
  id: string;
  label: string;
  color: string;
  examples: string[];
  existingExamples?: string[]; // Examples that came from existing patterns
  type: 'PII' | 'FINANCIAL' | 'MEDICAL' | 'CLASSIFICATION' | 'CUSTOM';
  regex?: string; // Optional regex pattern for matching
  regexPatterns?: string[]; // Multiple regex patterns for matching different formats
  isContextClue?: boolean; // Marks this pattern as a context clue (not sensitive itself)
  relatedPatterns?: string[]; // IDs of patterns this provides context for
  contextKeywords?: string[]; // Keywords that should appear near matches for context validation
}

export interface ContextClue {
  id: string;
  text: string;
  type: 'field_name' | 'label' | 'surrounding_text';
  position: 'before' | 'after' | 'both';
  distance: number; // Max characters away from sensitive data
}

export interface ProcessingFile {
  id: string;
  name: string;
  content: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  originalContent: string;
  redactedContent?: string;
  redactionCount?: number;
}

export interface RedactionRequest {
  prompt: string;
}

export interface RedactionResponse {
  redactedText: string;
}

export type ExportFormat = 'json' | 'csv' | 'txt';

export interface ExportOptions {
  format: ExportFormat;
  includeMetadata: boolean;
}