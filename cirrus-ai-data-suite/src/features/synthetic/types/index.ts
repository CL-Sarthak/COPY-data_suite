// Re-export from main types
export type { 
  SyntheticDataConfig, 
  SyntheticDataJob
} from '@/types/synthetic';

// Import for local use
import { SyntheticDataJob } from '@/types/synthetic';

// Feature-specific types
export interface ConfigFormData {
  name: string;
  sourceId?: string;
  templateId?: string;
  privacyLevel: 'low' | 'medium' | 'high' | 'maximum';
  recordCount: number;
  useTemplate: boolean;
}

export interface JobWithConfig extends SyntheticDataJob {
  configName?: string;
  configPrivacyLevel?: string;
}

export interface TemplateOption {
  id: string;
  name: string;
  description?: string;
  schema: Record<string, unknown>;
  sampleData?: unknown[];
}

export interface EnhancementResult {
  enhancedRecords: Record<string, unknown>[];
  enhancementStats: {
    originalRecords: number;
    enhancedRecords: number;
    originalFields: number;
    addedFields: number;
    totalFields: number;
    fieldsAdded: Array<{
      name: string;
      type: string;
      description: string;
    }>;
  };
  enhancementName: string;
}

export interface PreviewData {
  records: Record<string, unknown>[];
  schema: Record<string, unknown>;
  dataset: {
    name: string;
    recordCount: number;
  };
}