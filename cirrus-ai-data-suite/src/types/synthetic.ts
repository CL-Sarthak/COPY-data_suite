export interface SyntheticDataConfig {
  id: string;
  name: string;
  sourceDataset: string;
  outputFormat: 'json' | 'csv' | 'parquet' | 'sql';
  privacyLevel: 'low' | 'medium' | 'high' | 'maximum';
  preserveStatistics: boolean;
  preserveRelationships: boolean;
  configuration: GenerationConfig;
}

export interface GenerationConfig {
  // Record count
  recordCount: number;
  seedValue?: number;
  
  // Privacy settings
  kAnonymity?: number;
  lDiversity?: number;
  epsilonDifferentialPrivacy?: number;
  
  // Data transformation rules
  transformationRules: TransformationRule[];
  
  // Output settings
  includeMetadata: boolean;
  generateReport: boolean;
}

export interface TransformationRule {
  fieldName: string;
  transformationType: 'mask' | 'generalize' | 'suppress' | 'synthesize' | 'preserve';
  parameters?: {
    maskPattern?: string;
    generalizationLevel?: number;
    distributionType?: 'normal' | 'uniform' | 'categorical';
    preserveFormat?: boolean;
  };
}

export interface SyntheticDataJob {
  id: string;
  configId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  progress: number;
  recordsGenerated: number;
  errorMessage?: string;
  outputFile?: string;
}

export interface DataQualityMetrics {
  originalDataset: string;
  syntheticDataset: string;
  metrics: {
    statisticalSimilarity: number;
    attributeCorrelation: number;
    dataUtility: number;
    privacyRisk: number;
    reIdentificationRisk: number;
  };
  fieldLevelMetrics: FieldMetric[];
}

export interface FieldMetric {
  fieldName: string;
  originalDistribution: Record<string, unknown>;
  syntheticDistribution: Record<string, unknown>;
  kolmogorovSmirnovTest: number;
  chiSquareTest: number;
  mutualInformation: number;
}