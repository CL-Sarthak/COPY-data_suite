import { logger } from '@/utils/logger';

export interface DataSource {
  id: string;
  name: string;
  type: string;
  summary?: string;
  recordCount?: number;
  tags?: string[];
  aiKeywords?: string[];
}

export interface RelationshipAnalysis {
  source1: DataSource;
  source2: DataSource;
  relationshipScore: number;
  relationshipType: 'unrelated' | 'weak' | 'moderate' | 'strong';
  evidence: Array<{
    type: 'keywords' | 'naming' | 'domain' | 'business_context' | 'data_type';
    description: string;
    confidence: number;
  }>;
  allowJoin: boolean;
  reason: string;
}

export class SourceRelationshipService {
  
  /**
   * Analyze the relationship between two data sources
   */
  static analyzeRelationship(source1: DataSource, source2: DataSource): RelationshipAnalysis {
    const evidence: RelationshipAnalysis['evidence'] = [];
    let totalScore = 0;
    
    // 1. Keyword similarity analysis
    const keywordAnalysis = this.analyzeKeywordSimilarity(source1, source2);
    if (keywordAnalysis.score > 0) {
      evidence.push({
        type: 'keywords',
        description: keywordAnalysis.description,
        confidence: keywordAnalysis.score
      });
      totalScore += keywordAnalysis.score * 0.4; // 40% weight for keywords
    }
    
    // 2. Naming pattern analysis
    const namingAnalysis = this.analyzeNamingSimilarity(source1, source2);
    if (namingAnalysis.score > 0) {
      evidence.push({
        type: 'naming',
        description: namingAnalysis.description,
        confidence: namingAnalysis.score
      });
      totalScore += namingAnalysis.score * 0.2; // 20% weight for naming
    }
    
    // 3. Business domain analysis
    const domainAnalysis = this.analyzeDomainSimilarity(source1, source2);
    if (domainAnalysis.score > 0) {
      evidence.push({
        type: 'domain',
        description: domainAnalysis.description,
        confidence: domainAnalysis.score
      });
      totalScore += domainAnalysis.score * 0.3; // 30% weight for domain
    }
    
    // 4. Data type similarity
    const typeAnalysis = this.analyzeDataTypeSimilarity(source1, source2);
    if (typeAnalysis.score > 0) {
      evidence.push({
        type: 'data_type',
        description: typeAnalysis.description,
        confidence: typeAnalysis.score
      });
      totalScore += typeAnalysis.score * 0.1; // 10% weight for data type
    }
    
    // Determine relationship type and whether to allow joins
    const relationshipType = this.categorizeRelationship(totalScore);
    const allowJoin = this.shouldAllowJoin(totalScore, evidence);
    
    return {
      source1,
      source2,
      relationshipScore: totalScore,
      relationshipType,
      evidence,
      allowJoin,
      reason: this.generateReason(relationshipType, evidence, allowJoin)
    };
  }
  
  /**
   * Analyze keyword similarity between sources
   */
  private static analyzeKeywordSimilarity(source1: DataSource, source2: DataSource): {
    score: number;
    description: string;
  } {
    const keywords1 = source1.aiKeywords || [];
    const keywords2 = source2.aiKeywords || [];
    
    if (keywords1.length === 0 || keywords2.length === 0) {
      return { score: 0, description: 'No keywords available for comparison' };
    }
    
    // Find shared keywords (exact matches)
    const exactMatches = keywords1.filter(k1 => 
      keywords2.some(k2 => k1.toLowerCase() === k2.toLowerCase())
    );
    
    // Find partial matches (one keyword contains another)
    const partialMatches = keywords1.filter(k1 => 
      keywords2.some(k2 => {
        const k1Lower = k1.toLowerCase();
        const k2Lower = k2.toLowerCase();
        return k1Lower.includes(k2Lower) || k2Lower.includes(k1Lower);
      })
    ).filter(k => !exactMatches.some(exact => exact.toLowerCase() === k.toLowerCase()));
    
    // Find semantic matches (business domain keywords)
    const semanticMatches = this.findSemanticMatches(keywords1, keywords2);
    
    // Calculate score based on matches
    const exactScore = exactMatches.length * 0.6;
    const partialScore = partialMatches.length * 0.3;
    const semanticScore = semanticMatches.length * 0.4;
    
    const totalKeywords = Math.max(keywords1.length, keywords2.length);
    const score = Math.min(1.0, (exactScore + partialScore + semanticScore) / totalKeywords);
    
    const matchDetails = [];
    if (exactMatches.length > 0) {
      matchDetails.push(`${exactMatches.length} exact keyword matches: ${exactMatches.slice(0, 3).join(', ')}${exactMatches.length > 3 ? '...' : ''}`);
    }
    if (partialMatches.length > 0) {
      matchDetails.push(`${partialMatches.length} partial matches`);
    }
    if (semanticMatches.length > 0) {
      matchDetails.push(`${semanticMatches.length} semantic matches`);
    }
    
    return {
      score,
      description: matchDetails.length > 0 ? matchDetails.join(', ') : 'No significant keyword matches'
    };
  }
  
  /**
   * Find semantic keyword matches (business domain related)
   */
  private static findSemanticMatches(keywords1: string[], keywords2: string[]): string[] {
    const semanticGroups = [
      // Healthcare/Medical
      ['patient', 'medical', 'healthcare', 'hospital', 'clinical', 'diagnosis', 'treatment', 'doctor', 'nurse', 'pharmacy'],
      // Financial
      ['financial', 'finance', 'money', 'payment', 'billing', 'invoice', 'transaction', 'account', 'bank', 'credit'],
      // Personal Information
      ['personal', 'identity', 'name', 'address', 'phone', 'email', 'contact', 'demographic', 'profile'],
      // Business Operations
      ['customer', 'client', 'order', 'product', 'service', 'sales', 'marketing', 'support'],
      // Government/Legal
      ['legal', 'compliance', 'regulation', 'government', 'license', 'permit', 'tax', 'law'],
      // Technology
      ['system', 'database', 'api', 'application', 'software', 'platform', 'integration']
    ];
    
    const matches: string[] = [];
    
    for (const group of semanticGroups) {
      const group1Matches = keywords1.filter(k => 
        group.some(g => k.toLowerCase().includes(g) || g.includes(k.toLowerCase()))
      );
      const group2Matches = keywords2.filter(k => 
        group.some(g => k.toLowerCase().includes(g) || g.includes(k.toLowerCase()))
      );
      
      if (group1Matches.length > 0 && group2Matches.length > 0) {
        matches.push(...group1Matches.slice(0, 2)); // Limit to avoid over-counting
      }
    }
    
    return matches;
  }
  
  /**
   * Analyze naming pattern similarity
   */
  private static analyzeNamingSimilarity(source1: DataSource, source2: DataSource): {
    score: number;
    description: string;
  } {
    const name1 = source1.name.toLowerCase();
    const name2 = source2.name.toLowerCase();
    
    // Split names into words and clean them
    const words1 = name1.split(/[\s_-]+/).filter(w => w.length > 2);
    const words2 = name2.split(/[\s_-]+/).filter(w => w.length > 2);
    
    if (words1.length === 0 || words2.length === 0) {
      return { score: 0, description: 'No meaningful words for comparison' };
    }
    
    // Find shared words
    const sharedWords = words1.filter(w1 => 
      words2.some(w2 => w1 === w2)
    );
    
    // Find similar words (edit distance)
    const similarWords = words1.filter(w1 => 
      words2.some(w2 => this.calculateEditDistance(w1, w2) <= 2 && w1.length > 3)
    ).filter(w => !sharedWords.includes(w));
    
    const totalUniqueWords = new Set([...words1, ...words2]).size;
    const score = (sharedWords.length * 0.8 + similarWords.length * 0.4) / totalUniqueWords;
    
    const description = [];
    if (sharedWords.length > 0) {
      description.push(`Shared words: ${sharedWords.join(', ')}`);
    }
    if (similarWords.length > 0) {
      description.push(`Similar words: ${similarWords.join(', ')}`);
    }
    
    return {
      score: Math.min(1.0, score),
      description: description.length > 0 ? description.join('; ') : 'No naming similarities'
    };
  }
  
  /**
   * Analyze business domain similarity
   */
  private static analyzeDomainSimilarity(source1: DataSource, source2: DataSource): {
    score: number;
    description: string;
  } {
    // Check for business context clues in summaries and names
    const text1 = `${source1.name} ${source1.summary || ''}`.toLowerCase();
    const text2 = `${source2.name} ${source2.summary || ''}`.toLowerCase();
    
    const businessDomains = [
      {
        name: 'Healthcare',
        keywords: ['patient', 'medical', 'health', 'hospital', 'clinic', 'doctor', 'nurse', 'prescription', 'diagnosis'],
        weight: 0.9
      },
      {
        name: 'Financial Services',
        keywords: ['bank', 'finance', 'payment', 'transaction', 'account', 'credit', 'loan', 'investment'],
        weight: 0.9
      },
      {
        name: 'E-commerce',
        keywords: ['order', 'product', 'customer', 'purchase', 'cart', 'shipping', 'inventory'],
        weight: 0.8
      },
      {
        name: 'Government',
        keywords: ['government', 'public', 'citizen', 'license', 'permit', 'tax', 'regulation'],
        weight: 0.8
      },
      {
        name: 'Education',
        keywords: ['student', 'school', 'university', 'education', 'course', 'grade', 'enrollment'],
        weight: 0.7
      }
    ];
    
    let bestDomainMatch: { name: string; score: number } | null = null;
    
    for (const domain of businessDomains) {
      const matches1 = domain.keywords.filter(kw => text1.includes(kw)).length;
      const matches2 = domain.keywords.filter(kw => text2.includes(kw)).length;
      
      if (matches1 > 0 && matches2 > 0) {
        const domainScore = ((matches1 + matches2) / domain.keywords.length) * domain.weight;
        if (!bestDomainMatch || domainScore > bestDomainMatch.score) {
          bestDomainMatch = { name: domain.name, score: domainScore };
        }
      }
    }
    
    if (bestDomainMatch) {
      return {
        score: Math.min(1.0, bestDomainMatch.score),
        description: `Both sources appear to be in ${bestDomainMatch.name} domain`
      };
    }
    
    return { score: 0, description: 'No clear business domain match' };
  }
  
  /**
   * Analyze data type similarity
   */
  private static analyzeDataTypeSimilarity(source1: DataSource, source2: DataSource): {
    score: number;
    description: string;
  } {
    if (source1.type === source2.type) {
      return {
        score: 0.5, // Moderate boost for same type
        description: `Both are ${source1.type} sources`
      };
    }
    
    // Check for compatible types that might be related
    const compatibleTypes = [
      ['file', 'api'], // Files and APIs can be related (e.g., API exports vs file imports)
      ['database', 'api'], // Database and API often related
      ['inbound_api', 'api'] // Different API types
    ];
    
    for (const [type1, type2] of compatibleTypes) {
      if ((source1.type === type1 && source2.type === type2) ||
          (source1.type === type2 && source2.type === type1)) {
        return {
          score: 0.3,
          description: `Compatible types: ${source1.type} and ${source2.type}`
        };
      }
    }
    
    return { score: 0, description: 'Different data source types' };
  }
  
  /**
   * Categorize relationship strength
   */
  private static categorizeRelationship(score: number): RelationshipAnalysis['relationshipType'] {
    if (score >= 0.7) return 'strong';
    if (score >= 0.4) return 'moderate';
    if (score >= 0.2) return 'weak';
    return 'unrelated';
  }
  
  /**
   * Determine if join should be allowed
   */
  private static shouldAllowJoin(score: number, evidence: RelationshipAnalysis['evidence']): boolean {
    // Allow joins for moderate to strong relationships
    if (score >= 0.4) return true;
    
    // Allow joins if there's strong domain evidence even with lower overall score
    const hasDomainEvidence = evidence.some(e => 
      e.type === 'domain' && e.confidence >= 0.6
    );
    
    if (hasDomainEvidence) return true;
    
    // Allow joins if there are multiple types of evidence
    const evidenceTypes = new Set(evidence.map(e => e.type));
    if (evidenceTypes.size >= 3 && score >= 0.3) return true;
    
    return false;
  }
  
  /**
   * Generate human-readable reason
   */
  private static generateReason(
    relationshipType: RelationshipAnalysis['relationshipType'],
    evidence: RelationshipAnalysis['evidence'],
    allowJoin: boolean
  ): string {
    const evidenceDescriptions = evidence.map(e => e.description).join('; ');
    
    if (allowJoin) {
      return `${relationshipType} relationship detected. Join allowed based on: ${evidenceDescriptions}`;
    } else {
      return `${relationshipType} relationship. Cross-source joins not recommended. ${evidenceDescriptions}`;
    }
  }
  
  /**
   * Simple edit distance calculation
   */
  private static calculateEditDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1, // deletion
          matrix[j - 1][i] + 1, // insertion
          matrix[j - 1][i - 1] + substitutionCost // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }
  
  /**
   * Analyze relationships for a group of data sources
   */
  static analyzeGroupRelationships(dataSources: DataSource[]): {
    relationships: RelationshipAnalysis[];
    allowedPairs: Array<{ source1Id: string; source2Id: string; reason: string }>;
    suggestions: string[];
  } {
    const relationships: RelationshipAnalysis[] = [];
    const allowedPairs: Array<{ source1Id: string; source2Id: string; reason: string }> = [];
    
    // Analyze all pairs
    for (let i = 0; i < dataSources.length; i++) {
      for (let j = i + 1; j < dataSources.length; j++) {
        const analysis = this.analyzeRelationship(dataSources[i], dataSources[j]);
        relationships.push(analysis);
        
        if (analysis.allowJoin) {
          allowedPairs.push({
            source1Id: dataSources[i].id,
            source2Id: dataSources[j].id,
            reason: analysis.reason
          });
        }
      }
    }
    
    // Generate suggestions based on analysis
    const suggestions = this.generateSuggestions(relationships);
    
    logger.info(`Source relationship analysis: ${relationships.length} pairs analyzed, ${allowedPairs.length} joins allowed`);
    
    return {
      relationships,
      allowedPairs,
      suggestions
    };
  }
  
  /**
   * Generate suggestions for improving relationships
   */
  private static generateSuggestions(relationships: RelationshipAnalysis[]): string[] {
    const suggestions: string[] = [];
    
    const unrelatedCount = relationships.filter(r => r.relationshipType === 'unrelated').length;
    const weakCount = relationships.filter(r => r.relationshipType === 'weak').length;
    
    if (unrelatedCount > relationships.length * 0.7) {
      suggestions.push('Consider generating more comprehensive AI keywords for data sources to improve relationship detection');
    }
    
    if (weakCount > 0) {
      suggestions.push('Review data source summaries to include more business context information');
    }
    
    const sourcesWithoutKeywords = relationships.flatMap(r => [r.source1, r.source2])
      .filter((source, index, self) => 
        self.findIndex(s => s.id === source.id) === index && 
        (!source.aiKeywords || source.aiKeywords.length === 0)
      );
    
    if (sourcesWithoutKeywords.length > 0) {
      suggestions.push(`Generate AI keywords for sources: ${sourcesWithoutKeywords.map(s => s.name).join(', ')}`);
    }
    
    return suggestions;
  }
}