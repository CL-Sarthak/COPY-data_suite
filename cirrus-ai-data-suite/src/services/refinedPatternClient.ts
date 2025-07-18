// Client-side service for refined patterns
// This is safe to use in browser components

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

export class RefinedPatternClient {
  /**
   * Get all refined patterns from the API
   */
  static async getAllRefinedPatterns(): Promise<RefinedPattern[]> {
    try {
      const response = await fetch('/api/patterns/refined');
      if (!response.ok) {
        throw new Error('Failed to fetch refined patterns');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching refined patterns:', error);
      return [];
    }
  }

  /**
   * Get a single refined pattern
   */
  static async getRefinedPattern(patternId: string): Promise<RefinedPattern | null> {
    try {
      const response = await fetch(`/api/patterns/refined?patternId=${patternId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch refined pattern');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching refined pattern:', error);
      return null;
    }
  }

  /**
   * Find matches using refined patterns (via API)
   */
  static async findMatches(
    content: string,
    patterns: RefinedPattern[]
  ): Promise<RefinedMatch[]> {
    try {
      const response = await fetch('/api/patterns/refined', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content, patterns }),
      });

      if (!response.ok) {
        throw new Error('Failed to find matches');
      }

      const data = await response.json();
      return data.matches;
    } catch (error) {
      console.error('Error finding matches:', error);
      // Fallback to client-side matching
      return this.findMatchesClientSide(content, patterns);
    }
  }

  /**
   * Client-side pattern matching fallback
   */
  private static findMatchesClientSide(
    content: string,
    patterns: RefinedPattern[]
  ): RefinedMatch[] {
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

            // Check exclusions
            if (!pattern.excludedExamples.includes(matchedText)) {
              matches.push({
                text: matchedText,
                start,
                end,
                pattern,
                confidence: 0.9
              });
            }
          }
        } catch (error) {
          console.warn(`Invalid regex for pattern ${pattern.label}:`, error);
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
          if (!pattern.excludedExamples.includes(matchedText)) {
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
                confidence: 0.85
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
}