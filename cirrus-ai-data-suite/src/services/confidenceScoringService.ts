import { FixResult, FixContext } from './autoFixEngine';
import { FixMethod, RiskLevel } from '@/types/remediation';

export interface ConfidenceFactors {
  methodReliability: number;    // 0-1: How reliable is this fix method generally
  contextMatch: number;         // 0-1: How well does the fix match the context
  valueConsistency: number;     // 0-1: How consistent is the fix with similar values
  riskAssessment: number;       // 0-1: Risk-adjusted confidence (lower risk = higher confidence)
  historicalSuccess: number;    // 0-1: Historical success rate of this fix method
  validationResult: number;     // 0-1: How well does the fix pass validation
}

export interface ConfidenceScoreResult {
  finalScore: number;           // 0-1: Overall confidence score
  factors: ConfidenceFactors;
  reasoning: string[];
  riskLevel: RiskLevel;
  recommendation: 'auto_apply' | 'review_required' | 'manual_intervention' | 'reject';
}

/**
 * Confidence Scoring Service
 * Evaluates the reliability and safety of fix suggestions using multiple factors
 */
export class ConfidenceScoringService {
  
  // Method reliability scores based on empirical data and risk assessment
  private static readonly METHOD_RELIABILITY: Record<FixMethod, number> = {
    // Data Cleaning - High reliability, low risk
    'trim_whitespace': 0.95,
    'remove_extra_spaces': 0.90,
    'standardize_case': 0.85,
    'remove_special_chars': 0.75,
    'fix_encoding': 0.70,
    'clean_text_combo': 0.88,
    
    // Format Standardization - Medium to high reliability
    'standardize_email': 0.90,
    'standardize_phone': 0.80,
    'standardize_date': 0.85,
    'standardize_address': 0.70,
    'standardize_currency': 0.75,
    
    // Data Validation & Correction - Medium reliability
    'fix_typos': 0.65,
    'validate_range': 0.80,
    'fill_missing_values': 0.70,
    'validate_format': 0.75,
    
    // Business Logic Fixes - Medium reliability
    'standardize_country_code': 0.85,
    'fix_zip_code': 0.75,
    'standardize_industry_code': 0.70,
    'normalize_name': 0.65,
    
    // Statistical Fixes - Lower reliability due to complexity
    'detect_fix_outliers': 0.60,
    'impute_missing_numerical': 0.65,
    'smooth_time_series': 0.55,
    
    // Custom - Depends on implementation
    'custom_transformation': 0.50
  };

  // Risk level adjustments
  private static readonly RISK_ADJUSTMENTS: Record<RiskLevel, number> = {
    'low': 1.0,      // No adjustment
    'medium': 0.85,  // 15% reduction
    'high': 0.65     // 35% reduction
  };

  // Thresholds for recommendations
  private static readonly THRESHOLDS = {
    AUTO_APPLY: 0.9,        // Auto-apply if confidence >= 90%
    REVIEW_REQUIRED: 0.7,   // Require review if confidence >= 70%
    MANUAL_INTERVENTION: 0.4, // Manual intervention if confidence >= 40%
    // Below 40% = reject
  };

  /**
   * Calculate comprehensive confidence score for a fix result
   */
  static calculateConfidence(
    fixResult: FixResult,
    context?: FixContext,
    historicalData?: {
      successRate?: number;
      usageCount?: number;
      similarFixes?: FixResult[];
    }
  ): ConfidenceScoreResult {
    const factors: ConfidenceFactors = {
      methodReliability: this.calculateMethodReliability(fixResult.method),
      contextMatch: this.calculateContextMatch(fixResult, context),
      valueConsistency: this.calculateValueConsistency(fixResult, historicalData?.similarFixes),
      riskAssessment: this.calculateRiskAdjustment(fixResult.metadata.riskLevel),
      historicalSuccess: this.calculateHistoricalSuccess(fixResult.method, historicalData),
      validationResult: this.calculateValidationScore(fixResult)
    };

    // Weighted average of all factors
    const weights = {
      methodReliability: 0.25,
      contextMatch: 0.20,
      valueConsistency: 0.15,
      riskAssessment: 0.15,
      historicalSuccess: 0.15,
      validationResult: 0.10
    };

    const finalScore = Object.entries(factors).reduce((score, [factor, value]) => {
      return score + (value * weights[factor as keyof typeof weights]);
    }, 0);

    const reasoning = this.generateReasoning(factors, fixResult);
    const riskLevel = this.assessOverallRisk(factors, fixResult);
    const recommendation = this.getRecommendation(finalScore, riskLevel);

    return {
      finalScore: Math.round(finalScore * 1000) / 1000, // Round to 3 decimal places
      factors,
      reasoning,
      riskLevel,
      recommendation
    };
  }

  /**
   * Calculate method reliability score
   */
  private static calculateMethodReliability(method: FixMethod): number {
    return this.METHOD_RELIABILITY[method] || 0.5;
  }

  /**
   * Calculate how well the fix matches the context
   */
  private static calculateContextMatch(fixResult: FixResult, context?: FixContext): number {
    if (!context) return 0.5; // Neutral score when no context

    let score = 0.5;
    const reasoning: string[] = [];

    // Field type matching
    if (context.fieldType) {
      const methodFieldMapping: Record<string, string[]> = {
        'standardize_email': ['email', 'string'],
        'standardize_phone': ['phone', 'string'],
        'standardize_date': ['date', 'datetime', 'timestamp'],
        'fill_missing_values': ['number', 'integer', 'decimal', 'string'],
        'validate_range': ['number', 'integer', 'decimal'],
        'standardize_country_code': ['country', 'string'],
        'normalize_name': ['name', 'string'],
        'trim_whitespace': ['string'],
        'remove_special_chars': ['string'],
        'standardize_case': ['string']
      };

      const applicableFieldTypes = methodFieldMapping[fixResult.method] || ['string'];
      if (applicableFieldTypes.includes(context.fieldType)) {
        score += 0.3;
        reasoning.push(`Method is applicable to ${context.fieldType} fields`);
      } else {
        score -= 0.2;
        reasoning.push(`Method may not be optimal for ${context.fieldType} fields`);
      }
    }

    // Field name analysis for semantic matching
    if (context.fieldName) {
      const fieldName = context.fieldName.toLowerCase();
      const semanticMatches: Record<string, string[]> = {
        'standardize_email': ['email', 'mail', 'e_mail'],
        'standardize_phone': ['phone', 'tel', 'mobile', 'cell'],
        'standardize_date': ['date', 'created', 'updated', 'birth', 'expire'],
        'standardize_country_code': ['country', 'nation', 'region'],
        'normalize_name': ['name', 'first', 'last', 'full_name', 'title'],
        'fix_zip_code': ['zip', 'postal', 'postcode']
      };

      const keywords = semanticMatches[fixResult.method] || [];
      if (keywords.some(keyword => fieldName.includes(keyword))) {
        score += 0.2;
        reasoning.push(`Field name suggests this fix method is appropriate`);
      }
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Calculate value consistency with similar fixes
   */
  private static calculateValueConsistency(fixResult: FixResult, similarFixes?: FixResult[]): number {
    if (!similarFixes || similarFixes.length === 0) return 0.5;

    // Analyze pattern consistency
    const successfulFixes = similarFixes.filter(fix => fix.success);
    if (successfulFixes.length === 0) return 0.3;

    // Check if this fix follows similar patterns
    const currentChange = this.analyzeChangePattern(fixResult);
    const similarPatterns = successfulFixes.filter(fix => {
      const pattern = this.analyzeChangePattern(fix);
      return this.patternsMatch(currentChange, pattern);
    });

    const consistencyRatio = similarPatterns.length / successfulFixes.length;
    return 0.3 + (consistencyRatio * 0.7); // Base 0.3, up to 1.0
  }

  /**
   * Calculate risk-adjusted confidence
   */
  private static calculateRiskAdjustment(riskLevel: RiskLevel): number {
    return this.RISK_ADJUSTMENTS[riskLevel];
  }

  /**
   * Calculate historical success rate factor
   */
  private static calculateHistoricalSuccess(
    method: FixMethod, 
    historicalData?: { successRate?: number; usageCount?: number }
  ): number {
    if (!historicalData?.successRate) {
      // Use default method reliability as fallback
      return this.METHOD_RELIABILITY[method] || 0.5;
    }

    const { successRate, usageCount = 0 } = historicalData;
    
    // Confidence in the success rate increases with usage count
    const confidenceMultiplier = Math.min(1, usageCount / 100); // Full confidence at 100+ uses
    const adjustedScore = (successRate * confidenceMultiplier) + (0.5 * (1 - confidenceMultiplier));
    
    return adjustedScore;
  }

  /**
   * Calculate validation score based on fix result metadata
   */
  private static calculateValidationScore(fixResult: FixResult): number {
    let score = 0.5;

    // Success is a strong positive indicator
    if (fixResult.success) {
      score += 0.3;
    }

    // Reversible fixes are safer
    if (fixResult.metadata.reversible) {
      score += 0.1;
    }

    // Data loss is a negative factor
    if (fixResult.metadata.dataLoss) {
      score -= 0.2;
    }

    // Fast execution suggests simplicity and reliability
    const executionTime = fixResult.metadata.executionTime || 0;
    if (executionTime < 100) { // Less than 100ms
      score += 0.1;
    } else if (executionTime > 1000) { // More than 1 second
      score -= 0.1;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Analyze the pattern of change in a fix
   */
  private static analyzeChangePattern(fixResult: FixResult): {
    type: 'case_change' | 'whitespace' | 'format' | 'substitution' | 'addition' | 'removal' | 'complex';
    magnitude: number;
  } {
    const original = String(fixResult.originalValue || '');
    const fixed = String(fixResult.fixedValue || '');

    if (original.toLowerCase() === fixed.toLowerCase()) {
      return { type: 'case_change', magnitude: 0.1 };
    }

    if (original.replace(/\s/g, '') === fixed.replace(/\s/g, '')) {
      return { type: 'whitespace', magnitude: 0.2 };
    }

    if (original.length === fixed.length) {
      return { type: 'substitution', magnitude: 0.5 };
    }

    if (fixed.includes(original) || original.includes(fixed)) {
      return fixed.length > original.length 
        ? { type: 'addition', magnitude: 0.6 }
        : { type: 'removal', magnitude: 0.4 };
    }

    // Check for format patterns (email, phone, etc.)
    const emailPattern = /@/;
    const phonePattern = /[\d\-\(\)\s\+]/;
    
    if (emailPattern.test(original) && emailPattern.test(fixed)) {
      return { type: 'format', magnitude: 0.3 };
    }

    if (phonePattern.test(original) && phonePattern.test(fixed)) {
      return { type: 'format', magnitude: 0.3 };
    }

    return { type: 'complex', magnitude: 0.8 };
  }

  /**
   * Check if two change patterns match
   */
  private static patternsMatch(pattern1: { type: string; magnitude: number }, pattern2: { type: string; magnitude: number }): boolean {
    return pattern1.type === pattern2.type && 
           Math.abs(pattern1.magnitude - pattern2.magnitude) < 0.3;
  }

  /**
   * Generate human-readable reasoning for the confidence score
   */
  private static generateReasoning(factors: ConfidenceFactors, fixResult: FixResult): string[] {
    const reasoning: string[] = [];

    // Method reliability
    if (factors.methodReliability >= 0.9) {
      reasoning.push(`${fixResult.method} is a highly reliable fix method`);
    } else if (factors.methodReliability >= 0.7) {
      reasoning.push(`${fixResult.method} is a moderately reliable fix method`);
    } else {
      reasoning.push(`${fixResult.method} has lower reliability and requires careful review`);
    }

    // Context matching
    if (factors.contextMatch >= 0.8) {
      reasoning.push('Fix method is well-suited for this field type and context');
    } else if (factors.contextMatch <= 0.4) {
      reasoning.push('Fix method may not be optimal for this field type');
    }

    // Value consistency
    if (factors.valueConsistency >= 0.8) {
      reasoning.push('Fix follows consistent patterns with similar successful fixes');
    } else if (factors.valueConsistency <= 0.4) {
      reasoning.push('Fix pattern differs from previously successful fixes');
    }

    // Risk assessment
    if (factors.riskAssessment < 0.8) {
      reasoning.push('Confidence reduced due to high risk level of this fix');
    }

    // Historical success
    if (factors.historicalSuccess >= 0.9) {
      reasoning.push('Fix method has excellent historical success rate');
    } else if (factors.historicalSuccess <= 0.5) {
      reasoning.push('Fix method has limited historical success data');
    }

    // Fix properties
    if (fixResult.metadata.reversible) {
      reasoning.push('Fix is reversible, reducing risk');
    } else {
      reasoning.push('Fix is not reversible, requiring extra caution');
    }

    if (fixResult.metadata.dataLoss) {
      reasoning.push('Fix may result in data loss');
    }

    return reasoning;
  }

  /**
   * Assess overall risk level considering all factors
   */
  private static assessOverallRisk(factors: ConfidenceFactors, fixResult: FixResult): RiskLevel {
    const originalRisk = fixResult.metadata.riskLevel;
    
    // Increase risk if confidence factors are low
    if (factors.methodReliability < 0.6 || factors.valueConsistency < 0.4) {
      return originalRisk === 'low' ? 'medium' : 'high';
    }

    // Increase risk if data loss is involved
    if (fixResult.metadata.dataLoss && !fixResult.metadata.reversible) {
      return originalRisk === 'low' ? 'medium' : originalRisk;
    }

    return originalRisk;
  }

  /**
   * Get recommendation based on confidence score and risk level
   */
  private static getRecommendation(
    confidence: number, 
    riskLevel: RiskLevel
  ): 'auto_apply' | 'review_required' | 'manual_intervention' | 'reject' {
    // High-risk fixes always require review
    if (riskLevel === 'high' && confidence < 0.95) {
      return confidence >= this.THRESHOLDS.REVIEW_REQUIRED 
        ? 'review_required' 
        : 'manual_intervention';
    }

    // Standard confidence-based recommendations
    if (confidence >= this.THRESHOLDS.AUTO_APPLY) {
      return 'auto_apply';
    } else if (confidence >= this.THRESHOLDS.REVIEW_REQUIRED) {
      return 'review_required';
    } else if (confidence >= this.THRESHOLDS.MANUAL_INTERVENTION) {
      return 'manual_intervention';
    } else {
      return 'reject';
    }
  }

  /**
   * Batch confidence scoring for multiple fix results
   */
  static calculateBatchConfidence(
    fixes: Array<{ result: FixResult; context?: FixContext }>,
    globalHistoricalData?: Record<FixMethod, { successRate: number; usageCount: number }>
  ): ConfidenceScoreResult[] {
    return fixes.map(({ result, context }) => {
      const historicalData = globalHistoricalData?.[result.method];
      return this.calculateConfidence(result, context, historicalData);
    });
  }

  /**
   * Suggest fix improvements based on confidence analysis
   */
  static suggestImprovements(scoreResult: ConfidenceScoreResult): string[] {
    const suggestions: string[] = [];
    const { factors, riskLevel } = scoreResult;

    if (factors.methodReliability < 0.7) {
      suggestions.push('Consider using a more reliable fix method for this type of issue');
    }

    if (factors.contextMatch < 0.6) {
      suggestions.push('Verify that this fix method is appropriate for the field type and context');
    }

    if (factors.valueConsistency < 0.5) {
      suggestions.push('Review similar fixes to ensure this follows consistent patterns');
    }

    if (factors.historicalSuccess < 0.6) {
      suggestions.push('Consider gathering more data about this fix method\'s success rate');
    }

    if (riskLevel === 'high') {
      suggestions.push('Consider adding validation steps or user review before applying this fix');
    }

    if (suggestions.length === 0) {
      suggestions.push('Fix appears to be well-configured and ready to apply');
    }

    return suggestions;
  }
}