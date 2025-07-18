/**
 * Data Profiling Service
 * Analyzes data quality, patterns, and characteristics for unified data catalogs
 */

import { UnifiedDataCatalog, UnifiedDataRecord } from './dataTransformationService';

export interface FieldProfile {
  name: string;
  type: string;
  nullable: boolean;
  
  // Basic statistics
  totalCount: number;
  nullCount: number;
  uniqueCount: number;
  completeness: number; // (totalCount - nullCount) / totalCount
  uniqueness: number; // uniqueCount / totalCount
  
  // Value analysis
  minValue?: unknown;
  maxValue?: unknown;
  avgValue?: number;
  medianValue?: unknown;
  mostCommonValues: Array<{ value: unknown; count: number; percentage: number }>;
  
  // Pattern analysis
  patterns: Array<{ pattern: string; count: number; percentage: number; examples: string[] }>;
  dataTypes: Array<{ type: string; count: number; percentage: number }>;
  
  // Quality indicators
  qualityScore: number; // 0-1 scale
  qualityIssues: string[];
  
  // Format analysis
  formats?: {
    dateFormats?: string[];
    numberFormats?: string[];
    phoneFormats?: string[];
    emailDomains?: string[];
  };
}

export interface DataQualityMetrics {
  overallScore: number; // 0-1 scale
  completeness: number;
  consistency: number;
  validity: number;
  uniqueness: number;
  
  // Issue summary
  totalIssues: number;
  criticalIssues: number;
  warningIssues: number;
  issues: Array<{
    type: 'critical' | 'warning' | 'info';
    field?: string;
    message: string;
    count: number;
    examples?: string[];
  }>;
}

export interface CrossFieldAnalysis {
  // Relationship detection
  potentialKeys: string[]; // Fields that could be primary keys
  foreignKeyRelationships: Array<{
    sourceField: string;
    targetField: string;
    confidence: number;
  }>;
  
  // Correlation analysis
  correlations: Array<{
    field1: string;
    field2: string;
    correlation: number;
    type: 'positive' | 'negative' | 'none';
  }>;
  
  // Dependency analysis
  functionalDependencies: Array<{
    dependentField: string;
    determinantFields: string[];
    confidence: number;
  }>;
}

export interface DataProfile {
  sourceId: string;
  sourceName: string;
  createdAt: string;
  recordCount: number;
  fieldCount: number;
  
  // Field-level profiles
  fields: FieldProfile[];
  
  // Overall quality metrics
  qualityMetrics: DataQualityMetrics;
  
  // Cross-field analysis
  crossFieldAnalysis: CrossFieldAnalysis;
  
  // Summary statistics
  summary: {
    dataTypes: Record<string, number>;
    qualityDistribution: Record<string, number>;
    patternComplexity: 'low' | 'medium' | 'high';
    recommendedActions: string[];
  };
}

class DataProfilingService {
  /**
   * Generate comprehensive data profile for a unified data catalog
   */
  async profileDataCatalog(catalog: UnifiedDataCatalog): Promise<DataProfile> {
    
    // Extract all field values for analysis
    const fieldData = this.extractFieldData(catalog.records);
    
    // Profile each field individually
    const fieldProfiles = await Promise.all(
      Object.keys(fieldData).map(fieldName => 
        this.profileField(fieldName, fieldData[fieldName])
      )
    );
    
    // Analyze cross-field relationships
    const crossFieldAnalysis = this.analyzeCrossFieldRelationships(fieldData, fieldProfiles);
    
    // Calculate overall quality metrics
    const qualityMetrics = this.calculateQualityMetrics(fieldProfiles);
    
    // Generate summary and recommendations
    const summary = this.generateSummary(fieldProfiles, qualityMetrics);
    
    return {
      sourceId: catalog.sourceId,
      sourceName: catalog.sourceName,
      createdAt: new Date().toISOString(),
      recordCount: catalog.totalRecords,
      fieldCount: fieldProfiles.length,
      fields: fieldProfiles,
      qualityMetrics,
      crossFieldAnalysis,
      summary
    };
  }
  
  /**
   * Extract field data from records for analysis
   */
  private extractFieldData(records: UnifiedDataRecord[]): Record<string, unknown[]> {
    const fieldData: Record<string, unknown[]> = {};
    
    records.forEach(record => {
      Object.entries(record.data).forEach(([fieldName, value]) => {
        if (!fieldData[fieldName]) {
          fieldData[fieldName] = [];
        }
        fieldData[fieldName].push(value);
      });
    });
    
    return fieldData;
  }
  
  /**
   * Profile individual field
   */
  private async profileField(fieldName: string, values: unknown[]): Promise<FieldProfile> {
    const totalCount = values.length;
    const nullCount = values.filter(v => v === null || v === undefined || v === '').length;
    const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
    const uniqueValues = new Set(nonNullValues);
    const uniqueCount = uniqueValues.size;
    
    // Basic statistics
    const completeness = totalCount > 0 ? (totalCount - nullCount) / totalCount : 0;
    const uniqueness = totalCount > 0 ? uniqueCount / totalCount : 0;
    
    // Determine primary data type
    const dataTypes = this.analyzeDataTypes(nonNullValues);
    const primaryType = dataTypes[0]?.type || 'unknown';
    
    // Value analysis
    const { minValue, maxValue, avgValue, medianValue } = this.analyzeValueRange(nonNullValues, primaryType);
    const mostCommonValues = this.findMostCommonValues(nonNullValues, 10);
    
    // Pattern analysis
    const patterns = this.analyzePatterns(nonNullValues);
    
    // Format analysis
    const formats = this.analyzeFormats(nonNullValues, primaryType);
    
    // Quality assessment
    const qualityScore = this.calculateFieldQualityScore({
      completeness,
      uniqueness,
      dataTypes,
      patterns,
      totalCount
    });
    
    const qualityIssues = this.identifyQualityIssues({
      fieldName,
      completeness,
      uniqueness,
      dataTypes,
      patterns,
      totalCount,
      nullCount
    });
    
    return {
      name: fieldName,
      type: primaryType,
      nullable: nullCount > 0,
      totalCount,
      nullCount,
      uniqueCount,
      completeness,
      uniqueness,
      minValue,
      maxValue,
      avgValue,
      medianValue,
      mostCommonValues,
      patterns,
      dataTypes,
      qualityScore,
      qualityIssues,
      formats
    };
  }
  
  /**
   * Analyze data types in field values
   */
  private analyzeDataTypes(values: unknown[]): Array<{ type: string; count: number; percentage: number }> {
    const typeCounts: Record<string, number> = {};
    
    values.forEach(value => {
      const type = this.detectValueType(value);
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    
    const total = values.length;
    return Object.entries(typeCounts)
      .map(([type, count]) => ({
        type,
        count,
        percentage: total > 0 ? count / total : 0
      }))
      .sort((a, b) => b.count - a.count);
  }
  
  /**
   * Detect the type of a single value
   */
  private detectValueType(value: unknown): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'boolean') return 'boolean';
    if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'float';
    
    const str = String(value);
    
    // Date detection
    if (this.isDate(str)) return 'date';
    
    // Email detection
    if (this.isEmail(str)) return 'email';
    
    // Phone detection
    if (this.isPhone(str)) return 'phone';
    
    // URL detection
    if (this.isUrl(str)) return 'url';
    
    // Number detection (for string numbers)
    if (this.isNumericString(str)) return 'numeric_string';
    
    // JSON detection
    if (this.isJson(str)) return 'json';
    
    return 'string';
  }
  
  /**
   * Analyze value ranges for numeric/date fields
   */
  private analyzeValueRange(values: unknown[], type: string): {
    minValue?: unknown;
    maxValue?: unknown;
    avgValue?: number;
    medianValue?: unknown;
  } {
    if (values.length === 0) return {};
    
    if (type === 'integer' || type === 'float' || type === 'numeric_string') {
      const numValues = values
        .map(v => Number(v))
        .filter(n => !isNaN(n))
        .sort((a, b) => a - b);
      
      if (numValues.length === 0) return {};
      
      return {
        minValue: numValues[0],
        maxValue: numValues[numValues.length - 1],
        avgValue: numValues.reduce((sum, n) => sum + n, 0) / numValues.length,
        medianValue: numValues[Math.floor(numValues.length / 2)]
      };
    }
    
    if (type === 'date') {
      const dateValues = values
        .map(v => new Date(String(v)))
        .filter(d => !isNaN(d.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());
      
      if (dateValues.length === 0) return {};
      
      return {
        minValue: dateValues[0].toISOString(),
        maxValue: dateValues[dateValues.length - 1].toISOString(),
        medianValue: dateValues[Math.floor(dateValues.length / 2)].toISOString()
      };
    }
    
    // For strings, find min/max by length
    if (type === 'string') {
      const stringValues = values
        .map(v => String(v))
        .sort((a, b) => a.length - b.length);
      
      return {
        minValue: stringValues[0],
        maxValue: stringValues[stringValues.length - 1]
      };
    }
    
    return {};
  }
  
  /**
   * Find most common values
   */
  private findMostCommonValues(values: unknown[], limit: number): Array<{ value: unknown; count: number; percentage: number }> {
    const valueCounts: Map<string, { value: unknown; count: number }> = new Map();
    
    values.forEach(value => {
      const key = String(value);
      if (valueCounts.has(key)) {
        valueCounts.get(key)!.count++;
      } else {
        valueCounts.set(key, { value, count: 1 });
      }
    });
    
    const total = values.length;
    return Array.from(valueCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, limit)
      .map(({ value, count }) => ({
        value,
        count,
        percentage: total > 0 ? count / total : 0
      }));
  }
  
  /**
   * Analyze patterns in field values
   */
  private analyzePatterns(values: unknown[]): Array<{ pattern: string; count: number; percentage: number; examples: string[] }> {
    const patternCounts: Map<string, { count: number; examples: Set<string> }> = new Map();
    
    values.forEach(value => {
      const str = String(value);
      const pattern = this.extractPattern(str);
      
      if (patternCounts.has(pattern)) {
        const entry = patternCounts.get(pattern)!;
        entry.count++;
        if (entry.examples.size < 3) {
          entry.examples.add(str);
        }
      } else {
        patternCounts.set(pattern, { count: 1, examples: new Set([str]) });
      }
    });
    
    const total = values.length;
    return Array.from(patternCounts.entries())
      .map(([pattern, { count, examples }]) => ({
        pattern,
        count,
        percentage: total > 0 ? count / total : 0,
        examples: Array.from(examples)
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 patterns
  }
  
  /**
   * Extract pattern from string (e.g., "123-45-6789" -> "NNN-NN-NNNN")
   */
  private extractPattern(str: string): string {
    return str
      .replace(/\d/g, 'N')
      .replace(/[a-zA-Z]/g, 'A')
      .replace(/\s/g, 'S');
  }
  
  /**
   * Analyze formats for specific data types
   */
  private analyzeFormats(values: unknown[], type: string): FieldProfile['formats'] {
    const formats: FieldProfile['formats'] = {};
    
    if (type === 'date') {
      formats.dateFormats = this.detectDateFormats(values);
    }
    
    if (type === 'phone') {
      formats.phoneFormats = this.detectPhoneFormats(values);
    }
    
    if (type === 'email') {
      formats.emailDomains = this.extractEmailDomains(values);
    }
    
    if (type === 'integer' || type === 'float' || type === 'numeric_string') {
      formats.numberFormats = this.detectNumberFormats(values);
    }
    
    return Object.keys(formats).length > 0 ? formats : undefined;
  }
  
  /**
   * Calculate field quality score (0-1)
   */
  private calculateFieldQualityScore(params: {
    completeness: number;
    uniqueness: number;
    dataTypes: Array<{ type: string; count: number; percentage: number }>;
    patterns: Array<{ pattern: string; count: number; percentage: number; examples: string[] }>;
    totalCount: number;
  }): number {
    const { completeness, uniqueness, dataTypes, patterns } = params;
    
    // Base score from completeness (40% weight)
    let score = completeness * 0.4;
    
    // Data type consistency (30% weight)
    const primaryTypePercentage = dataTypes[0]?.percentage || 0;
    score += primaryTypePercentage * 0.3;
    
    // Pattern consistency (20% weight)
    const primaryPatternPercentage = patterns[0]?.percentage || 0;
    score += primaryPatternPercentage * 0.2;
    
    // Reasonable uniqueness (10% weight)
    // Penalize both too low uniqueness (duplicates) and too high (potential data entry errors)
    const uniquenessScore = uniqueness < 0.1 ? uniqueness * 5 : 
                           uniqueness > 0.95 ? Math.max(0, 2 - uniqueness) : 1;
    score += uniquenessScore * 0.1;
    
    return Math.max(0, Math.min(1, score));
  }
  
  /**
   * Identify quality issues in field
   */
  private identifyQualityIssues(params: {
    fieldName: string;
    completeness: number;
    uniqueness: number;
    dataTypes: Array<{ type: string; count: number; percentage: number }>;
    patterns: Array<{ pattern: string; count: number; percentage: number; examples: string[] }>;
    totalCount: number;
    nullCount: number;
  }): string[] {
    const issues: string[] = [];
    const { completeness, uniqueness, dataTypes, patterns, totalCount } = params;
    
    // Completeness issues
    if (completeness < 0.5) {
      issues.push(`High missing data rate: ${Math.round((1 - completeness) * 100)}% null values`);
    } else if (completeness < 0.8) {
      issues.push(`Moderate missing data: ${Math.round((1 - completeness) * 100)}% null values`);
    }
    
    // Uniqueness issues
    if (uniqueness < 0.01 && totalCount > 100) {
      issues.push('Very low uniqueness - potential duplicate data');
    } else if (uniqueness === 1 && totalCount > 1000) {
      issues.push('All values unique - potential data entry errors');
    }
    
    // Data type consistency
    if (dataTypes.length > 3) {
      issues.push(`Mixed data types detected (${dataTypes.length} different types)`);
    } else if (dataTypes.length > 1 && dataTypes[0].percentage < 0.8) {
      issues.push(`Inconsistent data types - primary type only ${Math.round(dataTypes[0].percentage * 100)}%`);
    }
    
    // Pattern consistency
    if (patterns.length > 5 && patterns[0].percentage < 0.6) {
      issues.push('High pattern variation - inconsistent formatting');
    }
    
    return issues;
  }
  
  /**
   * Analyze cross-field relationships
   */
  private analyzeCrossFieldRelationships(
    fieldData: Record<string, unknown[]>,
    fieldProfiles: FieldProfile[]
  ): CrossFieldAnalysis {
    
    // Identify potential keys
    const potentialKeys = fieldProfiles
      .filter(profile => profile.uniqueness > 0.95 && profile.completeness > 0.95)
      .map(profile => profile.name);
    
    // Basic correlation analysis for numeric fields
    const numericFields = fieldProfiles
      .filter(profile => ['integer', 'float', 'numeric_string'].includes(profile.type))
      .map(profile => profile.name);
    
    const correlations = this.calculateCorrelations(fieldData, numericFields);
    
    return {
      potentialKeys,
      foreignKeyRelationships: [], // TODO: Implement foreign key detection
      correlations,
      functionalDependencies: [] // TODO: Implement dependency analysis
    };
  }
  
  /**
   * Calculate correlations between numeric fields
   */
  private calculateCorrelations(
    fieldData: Record<string, unknown[]>,
    numericFields: string[]
  ): Array<{ field1: string; field2: string; correlation: number; type: 'positive' | 'negative' | 'none' }> {
    const correlations: Array<{ field1: string; field2: string; correlation: number; type: 'positive' | 'negative' | 'none' }> = [];
    
    for (let i = 0; i < numericFields.length; i++) {
      for (let j = i + 1; j < numericFields.length; j++) {
        const field1 = numericFields[i];
        const field2 = numericFields[j];
        
        const correlation = this.pearsonCorrelation(
          fieldData[field1].map(v => Number(v)).filter(n => !isNaN(n)),
          fieldData[field2].map(v => Number(v)).filter(n => !isNaN(n))
        );
        
        if (Math.abs(correlation) > 0.1) { // Only include meaningful correlations
          correlations.push({
            field1,
            field2,
            correlation,
            type: correlation > 0 ? 'positive' : correlation < 0 ? 'negative' : 'none'
          });
        }
      }
    }
    
    return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }
  
  /**
   * Calculate Pearson correlation coefficient
   */
  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;
    
    const sumX = x.slice(0, n).reduce((sum, val) => sum + val, 0);
    const sumY = y.slice(0, n).reduce((sum, val) => sum + val, 0);
    const sumXY = x.slice(0, n).reduce((sum, val, i) => sum + val * y[i], 0);
    const sumX2 = x.slice(0, n).reduce((sum, val) => sum + val * val, 0);
    const sumY2 = y.slice(0, n).reduce((sum, val) => sum + val * val, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  }
  
  /**
   * Calculate overall quality metrics
   */
  private calculateQualityMetrics(fieldProfiles: FieldProfile[]): DataQualityMetrics {
    const totalFields = fieldProfiles.length;
    
    // Calculate overall scores
    const completeness = fieldProfiles.reduce((sum, field) => sum + field.completeness, 0) / totalFields;
    const avgQualityScore = fieldProfiles.reduce((sum, field) => sum + field.qualityScore, 0) / totalFields;
    
    // Calculate consistency (based on data type consistency)
    const consistency = fieldProfiles.reduce((sum, field) => {
      const primaryTypePercentage = field.dataTypes[0]?.percentage || 0;
      return sum + primaryTypePercentage;
    }, 0) / totalFields;
    
    // Calculate validity (fields with no quality issues)
    const validFields = fieldProfiles.filter(field => field.qualityIssues.length === 0).length;
    const validity = validFields / totalFields;
    
    // Calculate uniqueness (average uniqueness across appropriate fields)
    const uniquenessFields = fieldProfiles.filter(field => field.totalCount > 1);
    const uniqueness = uniquenessFields.length > 0 
      ? uniquenessFields.reduce((sum, field) => sum + field.uniqueness, 0) / uniquenessFields.length
      : 1;
    
    // Collect all issues
    const allIssues = fieldProfiles.flatMap(field => 
      field.qualityIssues.map(issue => ({
        type: this.categorizeIssue(issue) as 'critical' | 'warning' | 'info',
        field: field.name,
        message: issue,
        count: 1,
        examples: []
      }))
    );
    
    const criticalIssues = allIssues.filter(issue => issue.type === 'critical').length;
    const warningIssues = allIssues.filter(issue => issue.type === 'warning').length;
    
    return {
      overallScore: avgQualityScore,
      completeness,
      consistency,
      validity,
      uniqueness,
      totalIssues: allIssues.length,
      criticalIssues,
      warningIssues,
      issues: allIssues
    };
  }
  
  /**
   * Categorize quality issue severity
   */
  private categorizeIssue(issue: string): string {
    if (issue.includes('High missing data') || issue.includes('All values unique')) {
      return 'critical';
    }
    if (issue.includes('Moderate missing data') || issue.includes('Mixed data types')) {
      return 'warning';
    }
    return 'info';
  }
  
  /**
   * Generate summary and recommendations
   */
  private generateSummary(fieldProfiles: FieldProfile[], qualityMetrics: DataQualityMetrics): DataProfile['summary'] {
    // Count data types
    const dataTypes: Record<string, number> = {};
    fieldProfiles.forEach(field => {
      dataTypes[field.type] = (dataTypes[field.type] || 0) + 1;
    });
    
    // Quality distribution
    const qualityDistribution: Record<string, number> = {
      excellent: 0, // > 0.9
      good: 0,      // 0.7 - 0.9
      fair: 0,      // 0.5 - 0.7
      poor: 0       // < 0.5
    };
    
    fieldProfiles.forEach(field => {
      if (field.qualityScore > 0.9) qualityDistribution.excellent++;
      else if (field.qualityScore > 0.7) qualityDistribution.good++;
      else if (field.qualityScore > 0.5) qualityDistribution.fair++;
      else qualityDistribution.poor++;
    });
    
    // Pattern complexity
    const avgPatterns = fieldProfiles.reduce((sum, field) => sum + field.patterns.length, 0) / fieldProfiles.length;
    const patternComplexity: 'low' | 'medium' | 'high' = 
      avgPatterns < 2 ? 'low' : avgPatterns < 5 ? 'medium' : 'high';
    
    // Generate recommendations
    const recommendedActions: string[] = [];
    
    if (qualityMetrics.completeness < 0.8) {
      recommendedActions.push('Address missing data in fields with low completeness');
    }
    if (qualityMetrics.consistency < 0.8) {
      recommendedActions.push('Standardize data formats for consistency');
    }
    if (qualityMetrics.criticalIssues > 0) {
      recommendedActions.push('Resolve critical data quality issues');
    }
    if (patternComplexity === 'high') {
      recommendedActions.push('Consider data normalization to reduce pattern complexity');
    }
    
    return {
      dataTypes,
      qualityDistribution,
      patternComplexity,
      recommendedActions
    };
  }
  
  // Helper methods for data type detection
  private isDate(str: string): boolean {
    const date = new Date(str);
    return !isNaN(date.getTime()) && str.length > 8;
  }
  
  private isEmail(str: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
  }
  
  private isPhone(str: string): boolean {
    const digits = str.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 15 && /[\d\s\-\(\)\+\.]+/.test(str);
  }
  
  private isUrl(str: string): boolean {
    try {
      new URL(str);
      return true;
    } catch {
      return false;
    }
  }
  
  private isNumericString(str: string): boolean {
    return !isNaN(Number(str)) && str.trim() !== '';
  }
  
  private isJson(str: string): boolean {
    try {
      JSON.parse(str);
      return str.startsWith('{') || str.startsWith('[');
    } catch {
      return false;
    }
  }
  
  private detectDateFormats(values: unknown[]): string[] {
    const formats = new Set<string>();
    values.forEach(value => {
      const str = String(value);
      if (this.isDate(str)) {
        // Simple format detection
        if (/^\d{4}-\d{2}-\d{2}/.test(str)) formats.add('YYYY-MM-DD');
        if (/^\d{2}\/\d{2}\/\d{4}/.test(str)) formats.add('MM/DD/YYYY');
        if (/^\d{2}-\d{2}-\d{4}/.test(str)) formats.add('MM-DD-YYYY');
      }
    });
    return Array.from(formats);
  }
  
  private detectPhoneFormats(values: unknown[]): string[] {
    const formats = new Set<string>();
    values.forEach(value => {
      const str = String(value);
      if (this.isPhone(str)) {
        const pattern = this.extractPattern(str);
        formats.add(pattern);
      }
    });
    return Array.from(formats);
  }
  
  private extractEmailDomains(values: unknown[]): string[] {
    const domains = new Set<string>();
    values.forEach(value => {
      const str = String(value);
      if (this.isEmail(str)) {
        const domain = str.split('@')[1];
        domains.add(domain);
      }
    });
    return Array.from(domains).slice(0, 10); // Top 10 domains
  }
  
  private detectNumberFormats(values: unknown[]): string[] {
    const formats = new Set<string>();
    values.forEach(value => {
      const str = String(value);
      if (str.includes(',')) formats.add('comma-separated');
      if (str.includes('.') && !str.includes(',')) formats.add('decimal');
      if (str.startsWith('$')) formats.add('currency');
      if (str.includes('%')) formats.add('percentage');
    });
    return Array.from(formats);
  }
}

export const dataProfilingService = new DataProfilingService();