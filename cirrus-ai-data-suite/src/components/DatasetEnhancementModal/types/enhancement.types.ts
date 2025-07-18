import { DataSource } from '@/types/discovery';

// Enhancement result from API
export interface EnhancementResult {
  success: boolean;
  enhancedRecords: Record<string, unknown>[];
  enhancementStats: EnhancementStats;
  enhancementName: string;
  timestamp: string;
}

// Statistics about the enhancement
export interface EnhancementStats {
  originalRecords: number;
  enhancedRecords: number;
  originalFields: number;
  addedFields: number;
  totalFields: number;
  fieldsAdded: AddedField[];
}

// Field that was added during enhancement
export interface AddedField {
  name: string;
  type: string;
  description: string;
}

// Dataset analysis result
export interface DatasetAnalysis {
  datasetType: string;
  existingFields: string[];
  missingFields: MissingField[];
  confidence: number;
}

// Missing field suggestion
export interface MissingField {
  fieldName: string;
  fieldType: string;
  description: string;
  reasoning: string;
  priority: 'high' | 'medium' | 'low';
  dependencies?: string[];
}

// Component props
export interface DatasetEnhancementModalProps {
  isOpen: boolean;
  onClose: () => void;
  dataSource: DataSource;
  onEnhancementComplete: (enhancedData: EnhancementResult) => void;
}

// File information
export interface FileInfo {
  name: string;
  content?: string;
  type?: string;
  storageKey?: string;
}