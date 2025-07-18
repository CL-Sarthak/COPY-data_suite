import { Pattern } from './patternService';
import { contextAwarePatternService } from './contextAwarePatternService';
import { mlPatternService, MLMatch } from './mlPatternService';

export interface TestMatch {
  value: string;
  startIndex: number;
  endIndex: number;
  method: 'regex' | 'example' | 'context' | 'ml-ner' | 'ml-custom';
  confidence: number;
  mlLabel?: string; // For ML-detected entities
}

export interface TestResult {
  matches: TestMatch[];
  redactedText: string;
  redactionStyle: RedactionStyle;
  statistics: {
    totalMatches: number;
    regexMatches: number;
    exampleMatches: number;
    contextMatches: number;
    mlMatches: number;
    averageConfidence: number;
  };
}

export interface RedactionStyle {
  type: 'full' | 'partial' | 'token' | 'mask';
  format: string;
}

export class PatternTestingService {
  public learnPatternFromExamples(examples: string[]): string | null {
    return this.learnPatternFromExamplesInternal(examples);
  }

  public async testPatternWithML(text: string, pattern: Pattern, redactionStyle?: RedactionStyle, enableML: boolean = true): Promise<TestResult> {
    const matches: TestMatch[] = [];
    
    // Existing methods
    if (pattern.regex) {
      const regexMatches = this.findRegexMatches(text, pattern.regex);
      matches.push(...regexMatches);
    }
    
    // Test with multiple regex patterns if available
    if (pattern.regexPatterns && pattern.regexPatterns.length > 0) {
      for (const regexPattern of pattern.regexPatterns) {
        const regexMatches = this.findRegexMatches(text, regexPattern);
        matches.push(...regexMatches);
      }
    }
    
    const exampleMatches = this.findExampleMatches(text, pattern.examples);
    matches.push(...exampleMatches);
    
    const contextMatches = this.findContextMatches(text, pattern);
    matches.push(...contextMatches);
    
    // NEW: ML-based detection
    if (enableML) {
      const mlMatches = await this.findMLMatches(text, pattern);
      matches.push(...mlMatches);
    }
    
    // Remove duplicates and overlaps
    const filteredMatches = this.filterOverlappingMatches(matches);
    
    // Apply redaction
    const style = redactionStyle || this.getDefaultRedactionStyle(pattern.type);
    const redactedText = this.applyRedaction(text, filteredMatches, style);
    
    // Calculate statistics
    const statistics = {
      totalMatches: filteredMatches.length,
      regexMatches: filteredMatches.filter(m => m.method === 'regex').length,
      exampleMatches: filteredMatches.filter(m => m.method === 'example').length,
      contextMatches: filteredMatches.filter(m => m.method === 'context').length,
      mlMatches: filteredMatches.filter(m => m.method.startsWith('ml-')).length,
      averageConfidence: filteredMatches.length > 0 
        ? filteredMatches.reduce((sum, m) => sum + m.confidence, 0) / filteredMatches.length 
        : 0
    };
    
    return {
      matches: filteredMatches,
      redactedText,
      redactionStyle: style,
      statistics
    };
  }
  private redactionStyles: Record<string, RedactionStyle[]> = {
    'PII': [
      { type: 'full', format: '[REDACTED]' },
      { type: 'partial', format: 'XXX-XX-####' }, // For SSN
      { type: 'token', format: '[PII-{index}]' },
      { type: 'mask', format: '****' }
    ],
    'FINANCIAL': [
      { type: 'full', format: '[REDACTED-FINANCIAL]' },
      { type: 'partial', format: '****-****-****-####' }, // For credit cards
      { type: 'token', format: '[FIN-{index}]' },
      { type: 'mask', format: '################' }
    ],
    'MEDICAL': [
      { type: 'full', format: '[REDACTED-MEDICAL]' },
      { type: 'token', format: '[MED-{index}]' },
      { type: 'mask', format: '[MEDICAL-INFO]' }
    ],
    'CLASSIFICATION': [
      { type: 'full', format: '[CLASSIFIED]' },
      { type: 'token', format: '[CLASS-{index}]' },
      { type: 'mask', format: '[REDACTED-GOV]' }
    ],
    'CUSTOM': [
      { type: 'full', format: '[REDACTED]' },
      { type: 'token', format: '[CUSTOM-{index}]' },
      { type: 'mask', format: '****' }
    ]
  };

  public testPattern(text: string, pattern: Pattern, redactionStyle?: RedactionStyle): TestResult {
    const matches: TestMatch[] = [];
    
    // 1. Test with regex if available
    if (pattern.regex) {
      const regexMatches = this.findRegexMatches(text, pattern.regex);
      matches.push(...regexMatches);
    }
    
    // 1b. Test with multiple regex patterns if available
    if (pattern.regexPatterns && pattern.regexPatterns.length > 0) {
      for (const regexPattern of pattern.regexPatterns) {
        const regexMatches = this.findRegexMatches(text, regexPattern);
        matches.push(...regexMatches);
      }
    }
    
    // 2. Test with examples (fuzzy matching)
    const exampleMatches = this.findExampleMatches(text, pattern.examples);
    matches.push(...exampleMatches);
    
    // 3. Test with context-aware detection
    const contextMatches = this.findContextMatches(text, pattern);
    matches.push(...contextMatches);
    
    // Remove duplicates and overlaps
    const filteredMatches = this.filterOverlappingMatches(matches);
    
    // Apply redaction
    const style = redactionStyle || this.getDefaultRedactionStyle(pattern.type);
    const redactedText = this.applyRedaction(text, filteredMatches, style);
    
    // Calculate statistics
    const statistics = {
      totalMatches: filteredMatches.length,
      regexMatches: filteredMatches.filter(m => m.method === 'regex').length,
      exampleMatches: filteredMatches.filter(m => m.method === 'example').length,
      contextMatches: filteredMatches.filter(m => m.method === 'context').length,
      mlMatches: 0, // No ML in synchronous version
      averageConfidence: filteredMatches.length > 0 
        ? filteredMatches.reduce((sum, m) => sum + m.confidence, 0) / filteredMatches.length 
        : 0
    };
    
    return {
      matches: filteredMatches,
      redactedText,
      redactionStyle: style,
      statistics
    };
  }
  
  private findRegexMatches(text: string, regexPattern: string): TestMatch[] {
    const matches: TestMatch[] = [];
    try {
      const regex = new RegExp(regexPattern, 'gi');
      let match;
      
      while ((match = regex.exec(text)) !== null) {
        matches.push({
          value: match[0],
          startIndex: match.index,
          endIndex: match.index + match[0].length,
          method: 'regex',
          confidence: 0.9 // High confidence for regex matches
        });
      }
    } catch (error) {
      // Only log errors in non-test environments
      if (process.env.NODE_ENV !== 'test') {
        console.error('Invalid regex pattern:', error);
      }
    }
    
    return matches;
  }
  
  private findExampleMatches(text: string, examples: string[]): TestMatch[] {
    const matches: TestMatch[] = [];
    
    // Check if this looks like address examples - if so, be more conservative
    const looksLikeAddressExamples = examples.some(ex => 
      this.looksLikeAddress(ex) || 
      /\d+\s+[A-Za-z\s]+(?:Drive|Dr|Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd)/i.test(ex) ||
      /[A-Za-z\s]+,\s*[A-Z]{2}/.test(ex) // City, State pattern
    );
    
    // For address patterns, only do exact matching (intelligent ML matching handles similarity)
    if (looksLikeAddressExamples) {
      
      // Only do exact matching for addresses - ML will handle intelligent similarity
      for (const example of examples) {
        if (!example) continue;
        
        // Exact match
        let index = text.toLowerCase().indexOf(example.toLowerCase());
        while (index !== -1) {
          matches.push({
            value: text.substring(index, index + example.length),
            startIndex: index,
            endIndex: index + example.length,
            method: 'example',
            confidence: 0.95
          });
          index = text.toLowerCase().indexOf(example.toLowerCase(), index + 1);
        }
      }
    } else {
      // For non-address patterns, use the normal pattern learning approach
      const learnedPattern = this.learnPatternFromExamplesInternal(examples);
      if (learnedPattern) {
        const patternMatches = this.findRegexMatches(text, learnedPattern);
        patternMatches.forEach(m => {
          m.method = 'example';
          m.confidence = 0.85; // Good confidence for learned patterns
        });
        matches.push(...patternMatches);
      }
      
      // Also do exact matching for high confidence
      for (const example of examples) {
        if (!example) continue;
        
        // Exact match
        let index = text.toLowerCase().indexOf(example.toLowerCase());
        while (index !== -1) {
          matches.push({
            value: text.substring(index, index + example.length),
            startIndex: index,
            endIndex: index + example.length,
            method: 'example',
            confidence: 0.95
          });
          index = text.toLowerCase().indexOf(example.toLowerCase(), index + 1);
        }
      }
    }
    
    return matches;
  }
  
  private learnPatternFromExamplesInternal(examples: string[]): string | null {
    const cleanExamples = examples.filter(e => e && e.trim());
    if (cleanExamples.length === 0) return null;
    
    // Check if all examples match a known pattern type
    
    // Address pattern detection
    if (cleanExamples.every(ex => this.looksLikeAddress(ex))) {
      // More restrictive address pattern - must start with number and end with street type
      // Also requires at least 2 words between number and street type
      return '\\b\\d{1,6}\\s+[A-Za-z]+\\s+[A-Za-z]+(?:\\s+[A-Za-z]+)*\\s+(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Lane|Ln|Drive|Dr|Court|Ct|Plaza|Pl|Way|Circle|Cir|Parkway|Pkwy|Highway|Hwy)\\b';
    }
    
    // SSN pattern detection
    if (cleanExamples.every(ex => /^\d{3}[-.\s]?\d{2}[-.\s]?\d{4}$/.test(ex))) {
      return '\\b\\d{3}[-\\.\\s]?\\d{2}[-\\.\\s]?\\d{4}\\b';
    }
    
    // Phone pattern detection
    if (cleanExamples.every(ex => this.looksLikePhone(ex))) {
      return '\\b(?:\\+?1[-\\.\\s]?)?\\(?\\d{3}\\)?[-\\.\\s]?\\d{3}[-\\.\\s]?\\d{4}\\b';
    }
    
    // Email pattern detection
    if (cleanExamples.every(ex => this.looksLikeEmail(ex))) {
      return '\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Z|a-z]{2,}\\b';
    }
    
    // Credit card pattern detection
    if (cleanExamples.every(ex => this.looksLikeCreditCard(ex))) {
      // Analyze the structure of the examples to generate appropriate regex
      const patterns = cleanExamples.map(ex => {
        const parts = ex.split(/[-\s]/);
        return parts.map(p => `\\d{${p.length}}`).join('[-\\s]?');
      });
      
      // If all examples have the same pattern, use it
      if (patterns.every(p => p === patterns[0])) {
        return `\\b${patterns[0]}\\b`;
      }
      
      // Otherwise, use a more flexible pattern
      return '\\b\\d{3,4}(?:[-\\s]?\\d{3,6}){2,4}\\b';
    }
    
    // Date pattern detection
    if (cleanExamples.every(ex => this.looksLikeDate(ex))) {
      return '\\b(?:\\d{1,2}[-/]\\d{1,2}[-/]\\d{2,4}|\\d{4}[-/]\\d{1,2}[-/]\\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\\s+\\d{1,2},?\\s+\\d{2,4})\\b';
    }
    
    // Generic number pattern
    if (cleanExamples.every(ex => /^[\d\s\-\.]+$/.test(ex))) {
      // Check if all examples have the same separator pattern
      const separatorPatterns = cleanExamples.map(ex => {
        const parts = ex.split(/[-\s\.]/);
        if (parts.length > 1) {
          const separator = ex.match(/[-\s\.]/)?.[0] || '-';
          return {
            lengths: parts.map(p => p.length),
            separator: separator === ' ' ? '\\s' : separator === '.' ? '\\.' : '-'
          };
        }
        return null;
      }).filter(Boolean);
      
      // If all examples have the same structure, generate exact pattern
      if (separatorPatterns.length === cleanExamples.length && 
          separatorPatterns.every(p => JSON.stringify(p?.lengths) === JSON.stringify(separatorPatterns[0]?.lengths))) {
        const pattern = separatorPatterns[0];
        if (pattern) {
          const regex = pattern.lengths.map(len => `\\d{${len}}`).join(`[${pattern.separator}]?`);
          return `\\b${regex}\\b`;
        }
      }
      
      // Otherwise, fallback to length-based pattern
      const lengths = cleanExamples.map(ex => ex.replace(/[\s\-\.]/g, '').length);
      const minLen = Math.min(...lengths);
      const maxLen = Math.max(...lengths);
      if (minLen === maxLen) {
        return `\\b\\d{${minLen}}\\b`;
      }
      return `\\b\\d{${minLen},${maxLen}}\\b`;
    }
    
    // Try to generate pattern from common structure
    const structurePattern = this.generateStructurePattern(cleanExamples);
    if (structurePattern) {
      return structurePattern;
    }
    
    return null;
  }
  
  private generateAddressPatterns(examples: string[]): string[] {
    const patterns: string[] = [];
    
    for (const example of examples) {
      if (!example || !example.trim()) continue;
      
      // Pattern 1: Street address with number + street name + type
      if (/^\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Lane|Ln|Drive|Dr|Court|Ct|Plaza|Pl|Way|Circle|Cir|Parkway|Pkwy|Highway|Hwy)$/i.test(example)) {
        // Create a pattern that matches similar street addresses
        const streetTypes = example.match(/(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Lane|Ln|Drive|Dr|Court|Ct|Plaza|Pl|Way|Circle|Cir|Parkway|Pkwy|Highway|Hwy)$/i);
        if (streetTypes) {
          // More restrictive: number + 1-4 words + specific street type
          patterns.push(`\\b\\d{1,6}\\s+(?:[A-Za-z]+\\s+){1,4}${streetTypes[0]}\\b`);
        }
      }
      
      // Pattern 2: City, State format
      else if (/^[A-Za-z\s]+,\s*[A-Z]{2}$/i.test(example)) {
        // Match city, state patterns (2-letter state codes)
        patterns.push('\\b[A-Za-z]+(?:\\s+[A-Za-z]+)*,\\s*[A-Z]{2}\\b');
      }
      
      // Pattern 3: ZIP code patterns
      else if (/^\d{5}(?:-\d{4})?$/.test(example)) {
        patterns.push('\\b\\d{5}(?:-\\d{4})?\\b');
      }
      
      // Pattern 4: PO Box patterns
      else if (/^(?:P\.?O\.?\s*)?Box\s+\d+$/i.test(example)) {
        patterns.push('\\b(?:P\\.?O\\.?\\s*)?Box\\s+\\d+\\b');
      }
    }
    
    return patterns;
  }

  private looksLikeAddress(text: string): boolean {
    return /^\d+\s+[A-Za-z]+(?:\s+[A-Za-z]+)*\s+(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Lane|Ln|Drive|Dr|Court|Ct|Plaza|Pl|Way|Circle|Cir|Parkway|Pkwy|Highway|Hwy)$/i.test(text);
  }
  
  private looksLikePhone(text: string): boolean {
    const cleaned = text.replace(/[\s\-\.\(\)]/g, '');
    return /^\+?1?\d{10}$/.test(cleaned);
  }
  
  private looksLikeEmail(text: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text);
  }
  
  private looksLikeCreditCard(text: string): boolean {
    const cleaned = text.replace(/[\s\-]/g, '');
    return /^\d{13,19}$/.test(cleaned);
  }
  
  private looksLikeDate(text: string): boolean {
    return /^(?:\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\d{4}[-/]\d{1,2}[-/]\d{1,2}|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+\d{2,4})$/i.test(text);
  }
  
  private generateStructurePattern(examples: string[]): string | null {
    if (examples.length < 2) return null;
    
    // Analyze structure of examples
    const structures = examples.map(ex => this.analyzeStructure(ex));
    
    // Check if all examples have similar structure
    const firstStructure = structures[0];
    const allSimilar = structures.every(s => this.isSimilarStructure(s, firstStructure));
    
    if (!allSimilar) return null;
    
    // Generate regex based on common structure
    return this.structureToRegex(firstStructure);
  }
  
  private analyzeStructure(text: string): string {
    return text
      .replace(/\d+/g, 'N') // Numbers become N
      .replace(/[A-Z][a-z]+/g, 'W') // Capitalized words become W
      .replace(/[a-z]+/g, 'w') // Lowercase words become w
      .replace(/[A-Z]+/g, 'U') // Uppercase words become U
      .replace(/\s+/g, ' '); // Normalize spaces
  }
  
  private isSimilarStructure(s1: string, s2: string): boolean {
    // Allow some flexibility in matching
    if (s1 === s2) return true;
    
    // Check if structures have same pattern with minor differences
    const parts1 = s1.split(' ');
    const parts2 = s2.split(' ');
    
    if (parts1.length !== parts2.length) return false;
    
    for (let i = 0; i < parts1.length; i++) {
      // Allow W and w to match (case variation)
      if (parts1[i] !== parts2[i] && 
          !(parts1[i] === 'W' && parts2[i] === 'w') &&
          !(parts1[i] === 'w' && parts2[i] === 'W')) {
        return false;
      }
    }
    
    return true;
  }
  
  private structureToRegex(structure: string): string {
    const parts = structure.split(' ');
    const regexParts = parts.map(part => {
      switch(part) {
        case 'N': return '\\d+';
        case 'W': return '[A-Z][a-z]+';
        case 'w': return '[a-z]+';
        case 'U': return '[A-Z]+';
        default: return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // Escape special chars
      }
    });
    
    return '\\b' + regexParts.join('\\s+') + '\\b';
  }
  
  private async findMLMatches(text: string, pattern: Pattern): Promise<TestMatch[]> {
    try {
      // For address patterns, use intelligent contextual matching
      if (pattern.name.toLowerCase().includes('address') && pattern.examples.length > 0) {
        return await this.findIntelligentAddressMatches(text, pattern.examples);
      }
      
      // For other patterns, use the standard ML approach
      const isClient = typeof window !== 'undefined';
      let mlMatches: MLMatch[] = [];
      
      if (isClient) {
        // Client-side: use API endpoint
        try {
          const response = await fetch('/api/ml/detect', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text })
          });
          
          if (response.ok) {
            const data = await response.json();
            mlMatches = data.matches || [];
          } else {
            console.error('ML detection API error:', await response.text());
          }
        } catch (error) {
          console.error('ML detection request failed:', error);
        }
      } else {
        // Server-side: use service directly
        mlMatches = await mlPatternService.detectEntities(text);
      }
      
      // Filter ML matches to ones relevant to this pattern
      const relevantMatches = mlMatches.filter(mlMatch => {
        return this.isMLMatchRelevantToPattern(mlMatch, pattern);
      });
      
      return relevantMatches.map(mlMatch => ({
        value: mlMatch.value,
        startIndex: mlMatch.startIndex,
        endIndex: mlMatch.endIndex,
        method: mlMatch.method,
        confidence: mlMatch.confidence,
        mlLabel: mlMatch.label
      }));
    } catch (error) {
      console.error('ML pattern detection failed:', error);
      return [];
    }
  }
  
  private async findIntelligentAddressMatches(text: string, examples: string[]): Promise<TestMatch[]> {
    
    const matches: TestMatch[] = [];
    
    // Split text into meaningful chunks (sentences, phrases)
    const chunks = this.extractTextChunks(text);
    
    for (const chunk of chunks) {
      // Skip chunks that are clearly not addresses
      if (this.isDefinitelyNotAddress(chunk.text)) {
        continue;
      }
      
      // Use contextual similarity to determine if this chunk is address-like
      const similarity = this.calculateAddressSimilarity(chunk.text, examples);
      
      if (similarity.score > 0.7) { // High threshold for precision
        matches.push({
          value: chunk.text,
          startIndex: chunk.start,
          endIndex: chunk.end,
          method: 'ml-custom',
          confidence: similarity.score,
          mlLabel: similarity.reason
        });
      }
    }
    
    return matches;
  }
  
  private extractTextChunks(text: string): Array<{text: string, start: number, end: number}> {
    const chunks: Array<{text: string, start: number, end: number}> = [];
    
    // Split by common delimiters but preserve positions
    const delimiters = /[.!?;]\s+|,\s+(?=[A-Z])|[\r\n]+/g;
    let lastIndex = 0;
    let match;
    
    while ((match = delimiters.exec(text)) !== null) {
      const chunkText = text.substring(lastIndex, match.index).trim();
      if (chunkText.length > 0) {
        chunks.push({
          text: chunkText,
          start: lastIndex,
          end: match.index
        });
      }
      lastIndex = match.index + match[0].length;
    }
    
    // Add final chunk
    if (lastIndex < text.length) {
      const chunkText = text.substring(lastIndex).trim();
      if (chunkText.length > 0) {
        chunks.push({
          text: chunkText,
          start: lastIndex,
          end: text.length
        });
      }
    }
    
    // Also consider smaller chunks (individual lines and phrases)
    const lines = text.split(/[\r\n]+/);
    let lineStart = 0;
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.length > 0) {
        const start = text.indexOf(trimmedLine, lineStart);
        if (start >= 0) {
          chunks.push({
            text: trimmedLine,
            start: start,
            end: start + trimmedLine.length
          });
        }
      }
      lineStart += line.length + 1;
    }
    
    // Remove duplicates and sort by position
    const uniqueChunks = chunks.filter((chunk, index, array) => 
      index === array.findIndex(c => c.text === chunk.text && c.start === chunk.start)
    );
    
    return uniqueChunks.sort((a, b) => a.start - b.start);
  }
  
  private isDefinitelyNotAddress(text: string): boolean {
    // Quick filters to exclude obvious non-addresses
    const excludePatterns = [
      /^(the|a|an|and|or|but|if|when|where|why|how|what|who|which)\s/i,
      /^(department|subject|request|information|purpose|description|task|work|project|contract|agreement|document)/i,
      /^(shall|will|must|should|may|can|could|would|might)/i,
      /^\d+\.\s/, // Numbered list items
      /^[A-Z]+:/, // Section headers
      /^(section|article|clause|paragraph)\s/i
    ];
    
    return excludePatterns.some(pattern => pattern.test(text.trim()));
  }
  
  private calculateAddressSimilarity(text: string, examples: string[]): {score: number, reason: string} {
    let maxScore = 0;
    let bestReason = '';
    
    for (const example of examples) {
      const similarity = this.compareAddressLikeness(text, example);
      if (similarity.score > maxScore) {
        maxScore = similarity.score;
        bestReason = similarity.reason;
      }
    }
    
    return { score: maxScore, reason: bestReason };
  }
  
  private compareAddressLikeness(text: string, example: string): {score: number, reason: string} {
    // Analyze structural and semantic similarity
    let score = 0;
    const reasons: string[] = [];
    
    // Check if both contain numbers
    const textHasNumbers = /\d/.test(text);
    const exampleHasNumbers = /\d/.test(example);
    if (textHasNumbers && exampleHasNumbers) {
      score += 0.2;
      reasons.push('both contain numbers');
    }
    
    // Check for address-specific keywords
    const addressKeywords = [
      'street', 'st', 'avenue', 'ave', 'road', 'rd', 'drive', 'dr', 'boulevard', 'blvd',
      'lane', 'ln', 'court', 'ct', 'place', 'pl', 'way', 'circle', 'cir', 'parkway', 'pkwy',
      'highway', 'hwy', 'route', 'rt', 'box', 'suite', 'apt', 'apartment', 'floor', 'unit'
    ];
    
    const textKeywords = addressKeywords.filter(kw => 
      new RegExp(`\\b${kw}\\b`, 'i').test(text)
    );
    const exampleKeywords = addressKeywords.filter(kw => 
      new RegExp(`\\b${kw}\\b`, 'i').test(example)
    );
    
    if (textKeywords.length > 0 && exampleKeywords.length > 0) {
      score += 0.4;
      reasons.push(`shared address keywords: ${textKeywords.join(', ')}`);
    }
    
    // Check for city, state patterns
    const cityStatePattern = /[A-Za-z\s]+,\s*[A-Z]{2}/;
    if (cityStatePattern.test(text) && cityStatePattern.test(example)) {
      score += 0.3;
      reasons.push('both match city, state pattern');
    }
    
    // Check for street number patterns
    const streetNumberPattern = /^\d+\s+[A-Za-z]/;
    if (streetNumberPattern.test(text) && streetNumberPattern.test(example)) {
      score += 0.3;
      reasons.push('both start with street number');
    }
    
    // Check structural similarity (word count, capitalization patterns)
    const textWords = text.split(/\s+/);
    const exampleWords = example.split(/\s+/);
    const wordCountSimilarity = 1 - Math.abs(textWords.length - exampleWords.length) / Math.max(textWords.length, exampleWords.length);
    score += wordCountSimilarity * 0.2;
    
    if (wordCountSimilarity > 0.8) {
      reasons.push('similar word count');
    }
    
    return {
      score: Math.min(1.0, score),
      reason: reasons.length > 0 ? reasons.join(', ') : 'structural similarity'
    };
  }

  private isMLMatchRelevantToPattern(mlMatch: MLMatch, pattern: Pattern): boolean {
    // For address patterns, be very strict - only accept exact ML address matches
    if (pattern.name.toLowerCase().includes('address')) {
      // Only accept ML matches that are specifically labeled as addresses
      // AND have high confidence (>80%)
      return mlMatch.label === 'Address' && mlMatch.confidence > 0.8;
    }
    
    // Map ML labels to pattern types
    const labelToTypeMapping: Record<string, string[]> = {
      'Person Name': ['PII'],
      'Organization': ['PII'],
      'Email Address': ['PII'],
      'Phone Number': ['PII'],
      'Social Security Number': ['PII'],
      'Address': ['PII'],
      'Credit Card Number': ['FINANCIAL'],
      'Monetary Amount': ['FINANCIAL'],
      'Date': ['PII', 'MEDICAL'],
      'Location': ['PII'],
      'Time': ['PII']
    };
    
    const relevantTypes = labelToTypeMapping[mlMatch.label] || [];
    
    // Check if ML label matches pattern type
    if (relevantTypes.includes(pattern.type)) {
      return true;
    }
    
    // Check if ML label matches pattern name (but be more strict)
    if (pattern.name.toLowerCase() === mlMatch.label.toLowerCase()) {
      return true;
    }
    
    return false;
  }
  
  private findContextMatches(text: string, pattern: Pattern): TestMatch[] {
    // Use our context-aware service
    const contextMatches = contextAwarePatternService.findMatches(text);
    
    // Filter to matches that could relate to this pattern
    const relevantMatches = contextMatches.filter(cm => {
      // Map pattern names to our pattern types
      const typeMapping: Record<string, string[]> = {
        'PII': ['Social Security Number', 'Email Address', 'Phone Number', 'Date of Birth', 'Address'],
        'FINANCIAL': ['Credit Card Number', 'Bank Account'],
        'MEDICAL': ['Medical Record Number'],
        'CLASSIFICATION': ['Classification Marking']
      };
      
      const relatedPatterns = typeMapping[pattern.type] || [];
      return relatedPatterns.includes(cm.pattern.name) || 
             cm.pattern.name.toLowerCase().includes(pattern.name.toLowerCase());
    });
    
    return relevantMatches.map(cm => ({
      value: cm.value,
      startIndex: cm.startIndex,
      endIndex: cm.endIndex,
      method: 'context' as const,
      confidence: cm.pattern.confidence(cm)
    }));
  }
  
  private createFuzzyPattern(example: string): string | null {
    // Create patterns for common variations
    if (/^\d{3}-\d{2}-\d{4}$/.test(example)) {
      // SSN pattern
      const digits = example.replace(/\D/g, '');
      return `\\b${digits.slice(0,3)}[-\\s.]?${digits.slice(3,5)}[-\\s.]?${digits.slice(5,9)}\\b`;
    }
    
    if (/^\d{3}-\d{3}-\d{4}$/.test(example)) {
      // Phone pattern
      const digits = example.replace(/\D/g, '');
      return `\\b\\(?${digits.slice(0,3)}\\)?[-\\s.]?${digits.slice(3,6)}[-\\s.]?${digits.slice(6,10)}\\b`;
    }
    
    // Credit card pattern
    if (/^\d{4}[-\s]\d{4}[-\s]\d{4}[-\s]\d{4}$/.test(example)) {
      const digits = example.replace(/\D/g, '');
      return `\\b${digits.slice(0,4)}[-\\s]?${digits.slice(4,8)}[-\\s]?${digits.slice(8,12)}[-\\s]?${digits.slice(12,16)}\\b`;
    }
    
    return null;
  }
  
  private filterOverlappingMatches(matches: TestMatch[]): TestMatch[] {
    // Sort by start index and confidence
    const sorted = matches.sort((a, b) => {
      if (a.startIndex === b.startIndex) {
        return b.confidence - a.confidence; // Higher confidence first
      }
      return a.startIndex - b.startIndex;
    });
    
    const filtered: TestMatch[] = [];
    
    for (const match of sorted) {
      const overlaps = filtered.some(existing => 
        (match.startIndex >= existing.startIndex && match.startIndex < existing.endIndex) ||
        (match.endIndex > existing.startIndex && match.endIndex <= existing.endIndex)
      );
      
      if (!overlaps) {
        filtered.push(match);
      }
    }
    
    return filtered;
  }
  
  private getDefaultRedactionStyle(patternType: string): RedactionStyle {
    return this.redactionStyles[patternType]?.[0] || { type: 'full', format: '[REDACTED]' };
  }
  
  public getAvailableRedactionStyles(patternType: string): RedactionStyle[] {
    return this.redactionStyles[patternType] || this.redactionStyles['CUSTOM'];
  }
  
  private applyRedaction(text: string, matches: TestMatch[], style: RedactionStyle): string {
    // Sort matches by position (descending) to replace from end to start
    const sortedMatches = [...matches].sort((a, b) => b.startIndex - a.startIndex);
    
    let redactedText = text;
    let tokenIndex = 1;
    
    for (const match of sortedMatches) {
      let replacement = style.format;
      
      if (style.type === 'partial') {
        replacement = this.applyPartialRedaction(match.value, style.format);
      } else if (style.type === 'token') {
        replacement = style.format.replace('{index}', tokenIndex.toString());
        tokenIndex++;
      } else if (style.type === 'mask') {
        replacement = this.applyMaskRedaction(match.value, style.format);
      }
      
      redactedText = redactedText.substring(0, match.startIndex) + 
                     replacement + 
                     redactedText.substring(match.endIndex);
    }
    
    return redactedText;
  }
  
  private applyPartialRedaction(value: string, format: string): string {
    // Handle specific partial redaction formats
    if (format === 'XXX-XX-####' && /^\d{3}-?\d{2}-?\d{4}$/.test(value)) {
      // SSN partial redaction
      const cleaned = value.replace(/\D/g, '');
      return `XXX-XX-${cleaned.slice(-4)}`;
    }
    
    if (format === '****-****-****-####' && value.replace(/\D/g, '').length >= 16) {
      // Credit card partial redaction
      const cleaned = value.replace(/\D/g, '');
      return `****-****-****-${cleaned.slice(-4)}`;
    }
    
    // Generic partial redaction - show last 4 characters
    if (value.length > 4) {
      return '*'.repeat(value.length - 4) + value.slice(-4);
    }
    
    return '*'.repeat(value.length);
  }
  
  private applyMaskRedaction(value: string, format: string): string {
    if (format === '****') {
      return '*'.repeat(value.length);
    }
    
    if (format.includes('#')) {
      // Replace with same number of # as value length
      return '#'.repeat(value.length);
    }
    
    return format;
  }
}

export const patternTestingService = new PatternTestingService();