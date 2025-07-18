import { PatternEntity } from '@/entities/PatternEntity';
import { logger } from '@/utils/logger';
import { getAppDataSource } from '@/database/connection';

export interface RefinedPattern {
  id: string;
  label: string;
  regex?: string;
  examples: string[];
  excludedExamples: string[];
  confidenceThreshold: number;
  color: string;
  type: string;
}

export interface RefinedMatch {
  text: string;
  start: number;
  end: number;
  pattern: RefinedPattern;
  confidence: number;
  excluded?: boolean;
}

export class RefinedPatternService {
  /**
   * Get pattern with refinements applied
   */
  static async getRefinedPattern(patternId: string): Promise<RefinedPattern | null> {
    try {
      const dataSource = await getAppDataSource();
      const patternRepo = dataSource.getRepository(PatternEntity);
      const pattern = await patternRepo.findOne({ where: { id: patternId } });
      
      if (!pattern) return null;

      return {
        id: pattern.id,
        label: pattern.name,
        regex: pattern.regex || undefined,
        examples: pattern.examples ? (typeof pattern.examples === 'string' ? JSON.parse(pattern.examples) : pattern.examples) : [],
        excludedExamples: pattern.excludedExamples ? (typeof pattern.excludedExamples === 'string' ? JSON.parse(pattern.excludedExamples) : pattern.excludedExamples) : [],
        confidenceThreshold: pattern.confidenceThreshold || 0.7,
        color: pattern.color,
        type: pattern.type
      };
    } catch (error) {
      logger.error('Error getting refined pattern:', error);
      return null;
    }
  }

  /**
   * Get all patterns with refinements
   */
  static async getAllRefinedPatterns(): Promise<RefinedPattern[]> {
    try {
      const dataSource = await getAppDataSource();
      const patternRepo = dataSource.getRepository(PatternEntity);
      const patterns = await patternRepo.find({ where: { isActive: true } });
      
      return patterns.map(pattern => ({
        id: pattern.id,
        label: pattern.name,
        regex: pattern.regex || undefined,
        examples: pattern.examples ? (typeof pattern.examples === 'string' ? JSON.parse(pattern.examples) : pattern.examples) : [],
        excludedExamples: pattern.excludedExamples ? (typeof pattern.excludedExamples === 'string' ? JSON.parse(pattern.excludedExamples) : pattern.excludedExamples) : [],
        confidenceThreshold: pattern.confidenceThreshold || 0.7,
        color: pattern.color,
        type: pattern.type
      }));
    } catch (error) {
      logger.error('Error getting refined patterns:', error);
      return [];
    }
  }

  /**
   * Test if a text matches a pattern, considering exclusions and confidence
   */
  static testPatternMatch(
    text: string, 
    pattern: RefinedPattern, 
    baseConfidence: number = 1.0
  ): { matches: boolean; confidence: number; excluded?: boolean } {
    // First check if this exact text is in the exclusion list
    if (pattern.excludedExamples.includes(text)) {
      return { matches: false, confidence: 0, excluded: true };
    }

    // Check if confidence meets threshold
    if (baseConfidence < pattern.confidenceThreshold) {
      return { matches: false, confidence: baseConfidence };
    }

    return { matches: true, confidence: baseConfidence };
  }

  /**
   * Find all pattern matches in content, with exclusions applied
   */
  static async findMatches(
    content: string,
    patterns: RefinedPattern[]
  ): Promise<RefinedMatch[]> {
    const matches: RefinedMatch[] = [];

    for (const pattern of patterns) {
      // Skip if pattern has no examples or regex
      if (!pattern.regex && (!pattern.examples || pattern.examples.length === 0)) {
        continue;
      }

      // Regex-based matching
      if (pattern.regex) {
        try {
          const regex = new RegExp(pattern.regex, 'gi');
          let match;
          
          while ((match = regex.exec(content)) !== null) {
            const matchedText = match[0];
            const start = match.index;
            const end = start + matchedText.length;

            // Check exclusions and confidence
            const testResult = this.testPatternMatch(matchedText, pattern, 0.9);
            
            if (testResult.matches) {
              matches.push({
                text: matchedText,
                start,
                end,
                pattern,
                confidence: testResult.confidence
              });
            }
          }
        } catch (error) {
          logger.error(`Invalid regex for pattern ${pattern.label}:`, error);
        }
      }

      // Example-based matching
      for (const example of pattern.examples) {
        let searchIndex = 0;
        
        while (true) {
          const index = content.toLowerCase().indexOf(example.toLowerCase(), searchIndex);
          if (index === -1) break;
          
          const matchedText = content.substring(index, index + example.length);
          
          // Check exclusions
          const testResult = this.testPatternMatch(matchedText, pattern, 0.85);
          
          if (testResult.matches) {
            // Check for duplicate
            const isDuplicate = matches.some(m => 
              m.pattern.id === pattern.id && 
              m.start === index && 
              m.end === index + example.length
            );
            
            if (!isDuplicate) {
              matches.push({
                text: matchedText,
                start: index,
                end: index + example.length,
                pattern,
                confidence: testResult.confidence
              });
            }
          }
          
          searchIndex = index + 1;
        }
      }
    }

    // Sort by position and remove overlaps
    return this.resolveOverlappingMatches(matches);
  }

  /**
   * Resolve overlapping matches by keeping highest confidence
   */
  private static resolveOverlappingMatches(matches: RefinedMatch[]): RefinedMatch[] {
    if (matches.length === 0) return [];

    // Sort by start position, then by confidence (descending)
    matches.sort((a, b) => {
      if (a.start !== b.start) return a.start - b.start;
      return b.confidence - a.confidence;
    });

    const resolved: RefinedMatch[] = [];
    let lastEnd = -1;

    for (const match of matches) {
      // If this match doesn't overlap with the last kept match, keep it
      if (match.start >= lastEnd) {
        resolved.push(match);
        lastEnd = match.end;
      } else if (match.confidence > resolved[resolved.length - 1].confidence) {
        // If it overlaps but has higher confidence, replace the last one
        resolved.pop();
        resolved.push(match);
        lastEnd = match.end;
      }
    }

    return resolved;
  }

  /**
   * Update pattern exclusions in real-time
   */
  static async addExclusion(patternId: string, text: string): Promise<void> {
    try {
      const dataSource = await getAppDataSource();
      const patternRepo = dataSource.getRepository(PatternEntity);
      const pattern = await patternRepo.findOne({ where: { id: patternId } });
      
      if (!pattern) return;

      const excludedExamples: string[] = pattern.excludedExamples 
        ? (typeof pattern.excludedExamples === 'string' ? JSON.parse(pattern.excludedExamples) : pattern.excludedExamples) 
        : [];

      if (!excludedExamples.includes(text)) {
        excludedExamples.push(text);
        
        await patternRepo.update(patternId, {
          excludedExamples: JSON.stringify(excludedExamples),
          lastRefinedAt: new Date()
        });

        logger.info(`Added exclusion to pattern ${patternId}: "${text}"`);
      }
    } catch (error) {
      logger.error('Error adding exclusion:', error);
    }
  }
}