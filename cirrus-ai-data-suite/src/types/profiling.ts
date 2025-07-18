/**
 * Enhanced profiling types for detailed data analysis
 */

export interface StatisticalSummary {
  mean?: number;
  mode?: unknown;
  median?: number;
  standardDeviation?: number;
  variance?: number;
  skewness?: number;
  kurtosis?: number;
  min?: number;
  max?: number;
  quartiles?: {
    q1: number;
    q2: number;
    q3: number;
  };
}

export interface OutlierAnalysis {
  count: number;
  percentage: number;
  values: unknown[];
  indices: number[];
  method: 'IQR' | 'Z-Score' | 'Modified-Z-Score';
  threshold?: number;
  bounds?: {
    lower?: number;
    upper?: number;
  };
}

export interface DistributionData {
  bins: DistributionBin[];
  type: 'normal' | 'skewed-left' | 'skewed-right' | 'bimodal' | 'uniform' | 'unknown';
  histogram: number[];
  binEdges: number[];
}

export interface DistributionBin {
  range: string;
  min: number;
  max: number;
  count: number;
  percentage: number;
}

export interface EnhancedFieldProfile {
  fieldName: string;
  dataType: 'numeric' | 'string' | 'boolean' | 'date' | 'mixed';
  dataClassification: 'categorical' | 'ordinal' | 'numerical';
  statistics: StatisticalSummary;
  outliers: OutlierAnalysis;
  distribution: DistributionData;
  sampleData: unknown[];
  uniqueCount: number;
  nullCount: number;
  totalCount: number;
  completeness: number;
  categoricalAnalysis?: {
    categories: Array<{
      value: unknown;
      count: number;
      percentage: number;
    }>;
    topCategories: Array<{
      value: unknown;
      count: number;
      percentage: number;
    }>;
  };
}

export interface EnhancedDataProfile {
  dataSourceId: string;
  dataSourceName: string;
  profileDate: string; // ISO string format to prevent date serialization issues
  recordCount: number;
  fieldCount: number;
  fields: EnhancedFieldProfile[];
  overallStatistics: {
    completeness: number;
    uniqueness: number;
    validity: number;
    consistency: number;
  };
  sampleRecords: Record<string, unknown>[];
}

export interface ProfileTableConfig {
  showStatistics: boolean;
  showOutliers: boolean;
  showDistributions: boolean;
  sampleSize: number;
  outlierMethod: 'IQR' | 'Z-Score' | 'Modified-Z-Score';
  distributionBins: number;
}

export interface EnhancedProfileRequest {
  dataSourceId: string;
  sampleSize?: number;
  includeOutliers?: boolean;
  includeDistributions?: boolean;
  outlierMethod?: 'IQR' | 'Z-Score' | 'Modified-Z-Score';
  distributionBins?: number;
}

export interface EnhancedProfileResponse {
  success: boolean;
  profile?: EnhancedDataProfile;
  error?: string;
}