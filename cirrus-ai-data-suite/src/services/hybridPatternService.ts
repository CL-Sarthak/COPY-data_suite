import { ContextAwarePatternService, ContextMatch } from './contextAwarePatternService';
import { FieldAwarePatternService } from './fieldAwarePatternService';
import { RelationshipDetectionService, RelationshipMatch } from './relationshipDetectionService';

export interface HybridMatch {
  patternName: string;
  category: string;
  value: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
  method: 'field-aware' | 'context-aware';
  reason: string;
  fieldName?: string; // Only for field-aware matches
  context?: string;   // Only for context-aware matches
}

export interface HybridDetectionResult {
  matches: HybridMatch[];
  relationships: RelationshipMatch[];
  stats: {
    total: number;
    fieldAware: number;
    contextAware: number;
    averageConfidence: number;
    byCategory: Record<string, number>;
    relationships: {
      totalRelationships: number;
      averageConfidence: number;
      byCategory: Record<string, number>;
      byPriority: Record<string, number>;
      totalRelatedFields: number;
    };
  };
}

export class HybridPatternService {
  private contextService = new ContextAwarePatternService();
  private fieldService = new FieldAwarePatternService();
  private relationshipService = new RelationshipDetectionService();

  /**
   * Detect patterns using hybrid approach:
   * - Field-aware detection for structured data (key: value format)
   * - Context-aware detection for unstructured text
   */
  detectPatterns(content: string): HybridMatch[] {
    const isStructuredData = this.isStructuredData(content);
    
    if (isStructuredData) {
      return this.detectStructuredPatterns(content);
    } else {
      return this.detectUnstructuredPatterns(content);
    }
  }

  /**
   * Enhanced detection with relationship analysis
   */
  detectPatternsWithRelationships(content: string): HybridDetectionResult {
    const matches = this.detectPatterns(content);
    const stats = this.getDetectionStats(matches);
    
    let relationships: RelationshipMatch[] = [];
    let relationshipStats = {
      totalRelationships: 0,
      averageConfidence: 0,
      byCategory: {},
      byPriority: {},
      totalRelatedFields: 0
    };

    // Only analyze relationships for structured data
    if (this.isStructuredData(content)) {
      const recordData = this.extractRecordData(content);
      relationships = this.relationshipService.detectRelationships(matches, recordData);
      relationshipStats = this.relationshipService.getRelationshipStats(relationships);
    }

    return {
      matches,
      relationships,
      stats: {
        ...stats,
        relationships: relationshipStats
      }
    };
  }

  /**
   * Determine if content is structured (field: value format) or unstructured text
   */
  private isStructuredData(content: string): boolean {
    const lines = content.split('\n').filter(line => line.trim());
    
    // Check for "Record X:" headers
    const hasRecordHeaders = lines.some(line => /^Record \d+:/.test(line.trim()));
    
    // Check for field: value patterns
    const fieldValueLines = lines.filter(line => /^[^:]+:\s*.+$/.test(line.trim()));
    const fieldValueRatio = fieldValueLines.length / lines.length;
    
    // Consider it structured if:
    // 1. Has record headers, OR
    // 2. >60% of lines follow field: value pattern
    return hasRecordHeaders || fieldValueRatio > 0.6;
  }

  /**
   * Use field-aware detection for structured data
   */
  private detectStructuredPatterns(content: string): HybridMatch[] {
    const fieldMatches = this.fieldService.detectPatterns(content);
    
    return fieldMatches.map(match => ({
      patternName: match.patternName,
      category: match.category,
      value: match.value,
      confidence: match.confidence,
      startIndex: match.startIndex,
      endIndex: match.endIndex,
      method: 'field-aware' as const,
      reason: match.reason,
      fieldName: match.fieldName
    }));
  }

  /**
   * Use context-aware detection for unstructured text
   */
  private detectUnstructuredPatterns(content: string): HybridMatch[] {
    const contextMatches = this.contextService.findMatches(content);
    
    return contextMatches.map(match => ({
      patternName: match.pattern.name,
      category: match.pattern.category,
      value: match.value,
      confidence: match.pattern.confidence(match),
      startIndex: match.startIndex,
      endIndex: match.endIndex,
      method: 'context-aware' as const,
      reason: this.getContextMatchReason(match),
      context: `${match.beforeContext}...${match.afterContext}`
    }));
  }

  /**
   * Generate human-readable reason for context-aware matches
   */
  private getContextMatchReason(match: ContextMatch): string {
    const reasons = [];
    
    const contextStr = (match.beforeContext + ' ' + match.afterContext).toLowerCase();
    const hasContextClues = match.pattern.contextClues.some(clue => 
      contextStr.includes(clue.toLowerCase())
    );
    
    if (hasContextClues) {
      const foundClues = match.pattern.contextClues.filter(clue => 
        contextStr.includes(clue.toLowerCase())
      );
      reasons.push(`context clues: ${foundClues.join(', ')}`);
    }
    
    reasons.push(`value matches ${match.pattern.name.toLowerCase()} format`);
    
    if (match.pattern.name === 'Social Security Number') {
      const cleaned = match.value.replace(/[-.\s]/g, '');
      if (cleaned.length === 9) {
        reasons.push('valid SSN format');
      }
    }
    
    if (match.pattern.name === 'Credit Card Number') {
      reasons.push('passes format validation');
    }
    
    return reasons.join(', ');
  }

  /**
   * Extract record data from structured content for relationship analysis
   */
  private extractRecordData(content: string): Record<string, unknown> {
    const recordData: Record<string, unknown> = {};
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines and record headers
      if (!trimmedLine || /^Record \d+:/.test(trimmedLine)) {
        continue;
      }
      
      // Parse field: value pairs
      const fieldMatch = trimmedLine.match(/^([^:]+):\s*(.*)$/);
      if (fieldMatch) {
        const [, fieldName, value] = fieldMatch;
        const cleanFieldName = fieldName.trim();
        const cleanValue = value.trim();
        
        // Store non-empty values
        if (cleanValue && cleanValue !== 'null' && cleanValue !== 'undefined') {
          recordData[cleanFieldName] = cleanValue;
        }
      }
    }
    
    return recordData;
  }

  /**
   * Get statistics about detection methods used
   */
  getDetectionStats(matches: HybridMatch[]): {
    total: number;
    fieldAware: number;
    contextAware: number;
    averageConfidence: number;
    byCategory: Record<string, number>;
  } {
    const fieldAware = matches.filter(m => m.method === 'field-aware').length;
    const contextAware = matches.filter(m => m.method === 'context-aware').length;
    
    const byCategory: Record<string, number> = {};
    matches.forEach(match => {
      byCategory[match.category] = (byCategory[match.category] || 0) + 1;
    });
    
    const avgConfidence = matches.length > 0 
      ? matches.reduce((sum, m) => sum + m.confidence, 0) / matches.length 
      : 0;

    return {
      total: matches.length,
      fieldAware,
      contextAware,
      averageConfidence: Math.round(avgConfidence * 100) / 100,
      byCategory
    };
  }
}