export interface AnnotationData {
  dataSourceId: string;
  dataSourceName: string;
  fields: string[];
  records: Record<string, unknown>[];
  page: number;
  pageSize: number;
  totalRecords: number;
}

export interface HighlightedText {
  text: string;
  isHighlighted: boolean;
  pattern?: import('@/services/patternService').Pattern;
  startIndex: number;
  endIndex: number;
}

export interface AnnotationPattern {
  type: string;
  pattern: string;
  value: string;
  field?: string;
  category?: string;
  confidence?: number;
}

export interface MLDetectionResult {
  patterns: AnnotationPattern[];
  processingTime: number;
}

// Re-export types
export type { DataSource } from '@/types/discovery';
export type { Pattern } from '@/services/patternService';