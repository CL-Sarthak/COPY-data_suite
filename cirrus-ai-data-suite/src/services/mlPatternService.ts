export interface MLMatch {
  value: string;
  label: string;
  confidence: number;
  startIndex: number;
  endIndex: number;
  method: 'ml-ner' | 'ml-custom';
  context?: string;
}

export interface MLEntity {
  text: string;
  label: string;
  confidence: number;
  start: number;
  end: number;
  type: 'PERSON' | 'ORGANIZATION' | 'LOCATION' | 'MONEY' | 'DATE' | 'TIME' | 'EMAIL' | 'PHONE' | 'SSN' | 'CREDIT_CARD' | 'ADDRESS' | 'OTHER';
}

export interface MLServiceConfig {
  enabled: boolean;
  provider: 'google' | 'vertex' | 'aws' | 'azure' | 'local' | 'none';
  apiKey?: string;
  endpoint?: string;
  projectId?: string;
}

export class MLPatternService {
  private config: MLServiceConfig;
  
  constructor(config?: Partial<MLServiceConfig>) {
    // Initialize with environment variables and defaults
    const isServer = typeof window === 'undefined';
    
    if (!isServer) {
      // Client-side: use defaults or passed config
      this.config = {
        enabled: false,
        provider: 'none',
        apiKey: undefined,
        endpoint: undefined,
        ...config
      };
    } else {
      // Server-side: use environment variables
      this.config = {
        enabled: process.env.ML_DETECTION_ENABLED !== 'false',
        provider: (process.env.ML_PROVIDER as MLServiceConfig['provider']) || 'none',
        apiKey: process.env.ML_API_KEY || process.env.GOOGLE_CLOUD_API_KEY || process.env.ANTHROPIC_API_KEY,
        endpoint: process.env.ML_ENDPOINT,
        ...config
      };
    }
    
    // Debug logging
    if (isServer) {
      console.log('[MLPatternService] Server-side initialization:', {
        enabled: this.config.enabled,
        provider: this.config.provider,
        hasApiKey: !!this.config.apiKey,
        envVars: {
          ML_DETECTION_ENABLED: process.env.ML_DETECTION_ENABLED,
          ML_PROVIDER: process.env.ML_PROVIDER,
          hasGoogleKey: !!process.env.GOOGLE_CLOUD_API_KEY,
          hasMLKey: !!process.env.ML_API_KEY
        }
      });
    }
  }

  public async detectEntities(text: string): Promise<MLMatch[]> {
    if (!this.config.enabled) {
      return [];
    }

    switch (this.config.provider) {
      case 'google':
        return this.detectWithGoogleNLP(text);
      case 'vertex':
        return this.detectWithVertexAI(text);
      case 'aws':
        return this.detectWithAWSComprehend();
      case 'azure':
        return this.detectWithAzureCognitive();
      case 'local':
        return this.detectWithLocalModel();
      default:
        throw new Error('ML pattern detection requires a configured provider. Please set up Google Cloud, Vertex AI, AWS Comprehend, Azure Cognitive Services, or a local ML model.');
    }
  }

  private extractContext(text: string, start: number, end: number, windowSize: number = 30): string {
    const contextStart = Math.max(0, start - windowSize);
    const contextEnd = Math.min(text.length, end + windowSize);
    return text.substring(contextStart, contextEnd);
  }

  private mapEntityTypeToLabel(type: MLEntity['type']): string {
    const mapping: Record<MLEntity['type'], string> = {
      'PERSON': 'Person Name',
      'ORGANIZATION': 'Organization',
      'LOCATION': 'Location',
      'MONEY': 'Monetary Amount',
      'DATE': 'Date',
      'TIME': 'Time',
      'EMAIL': 'Email Address',
      'PHONE': 'Phone Number',
      'SSN': 'Social Security Number',
      'CREDIT_CARD': 'Credit Card Number',
      'ADDRESS': 'Address',
      'OTHER': 'Other'
    };
    
    return mapping[type] || 'Unknown';
  }

  // Real ML service implementations
  private async detectWithGoogleNLP(text: string): Promise<MLMatch[]> {
    if (!this.config.apiKey) {
      throw new Error('Google NLP API key not configured. Please provide GOOGLE_CLOUD_API_KEY.');
    }

    try {
      // Try different Google Cloud API endpoints including Vertex AI
      const endpoints = [
        // Vertex AI endpoint (for Vertex AI Studio keys)
        `https://us-central1-aiplatform.googleapis.com/v1/projects/your-project/locations/us-central1/publishers/google/models/textembedding-gecko:predict`,
        // Standard Google Cloud NLP API with key parameter
        `https://language.googleapis.com/v1/documents:analyzeEntities?key=${this.config.apiKey}`,
        // Alternative endpoint that might work with Express keys
        `https://language.googleapis.com/v1/documents:analyzeEntities`,
      ];

      let response;
      let lastError;

      for (const url of endpoints) {
        try {
          const headers: Record<string, string> = {
            'Content-Type': 'application/json'
          };

          // Try both API key in URL and in header
          if (url.includes('?key=')) {
            // API key already in URL
          } else {
            // Try API key in header
            headers['X-Goog-Api-Key'] = this.config.apiKey;
          }

          response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify({
              document: {
                content: text,
                type: 'PLAIN_TEXT'
              },
              encodingType: 'UTF8'
            })
          });

          if (response.ok) {
            break; // Success, exit the loop
          } else {
            lastError = `${response.status} ${response.statusText}`;
          }
        } catch (err) {
          lastError = err;
          continue;
        }
      }

      if (!response || !response.ok) {
        throw new Error(`All Google NLP endpoints failed. Last error: ${lastError}`);
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Google NLP API error: ${response.status} ${response.statusText}`, errorText);
        
        if (response.status === 401) {
          console.error('Authentication failed. Google Cloud NLP requires a service account JSON key, not an API key.');
          console.error('Please see: https://cloud.google.com/natural-language/docs/reference/rest/v1/documents/analyzeEntities');
        }
        
        throw new Error(`Google NLP API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const matches: MLMatch[] = [];

      if (data.entities) {
        for (const entity of data.entities) {
          // Convert Google's entity types to our types
          const entityType = this.mapGoogleEntityType(entity.type);
          
          // Process each mention of this entity
          for (const mention of entity.mentions || []) {
            matches.push({
              value: mention.text.content,
              label: this.mapEntityTypeToLabel(entityType),
              confidence: entity.salience || 0.5,
              startIndex: mention.text.beginOffset || 0,
              endIndex: (mention.text.beginOffset || 0) + mention.text.content.length,
              method: 'ml-ner',
              context: this.extractContext(text, mention.text.beginOffset || 0, (mention.text.beginOffset || 0) + mention.text.content.length)
            });
          }
        }
      }

      return matches;
    } catch (error) {
      console.error('Google NLP API error:', error);
      throw new Error('Google NLP API failed. Please check your API key and ensure it has the necessary permissions for the Natural Language API.');
    }
  }

  private mapGoogleEntityType(googleType: string): MLEntity['type'] {
    const mapping: Record<string, MLEntity['type']> = {
      'PERSON': 'PERSON',
      'ORGANIZATION': 'ORGANIZATION',
      'LOCATION': 'LOCATION',
      'EVENT': 'OTHER',
      'WORK_OF_ART': 'OTHER',
      'CONSUMER_GOOD': 'OTHER',
      'PHONE_NUMBER': 'PHONE',
      'ADDRESS': 'ADDRESS',
      'DATE': 'DATE',
      'NUMBER': 'OTHER',
      'PRICE': 'MONEY'
    };
    
    return mapping[googleType] || 'OTHER';
  }

  private async detectWithAWSComprehend(): Promise<MLMatch[]> {
    // Implementation would use AWS Comprehend
    throw new Error('AWS Comprehend not configured. Please provide credentials.');
  }

  private async detectWithAzureCognitive(): Promise<MLMatch[]> {
    // Implementation would use Azure Cognitive Services
    throw new Error('Azure Cognitive Services not configured. Please provide API key.');
  }

  private async detectWithVertexAI(text: string): Promise<MLMatch[]> {
    if (!this.config.apiKey) {
      throw new Error('Vertex AI API key not configured. Please provide GOOGLE_CLOUD_API_KEY.');
    }

    try {
      // Use Google AI Studio API endpoint that works with API keys
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.config.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Extract all sensitive information entities from the following text. Return only a JSON array with objects containing: "text" (the entity), "type" (PERSON, ORGANIZATION, LOCATION, EMAIL, PHONE, SSN, CREDIT_CARD, ADDRESS, DATE, MONEY, or OTHER), "start" (character position), "end" (character position), and "confidence" (0-1). Text to analyze:\n\n${text}`
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            topK: 1,
            topP: 1,
            maxOutputTokens: 2048,
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Vertex AI API error: ${response.status} ${response.statusText}`, errorText);
        
        // Log more details for debugging
        console.error('API Key used:', this.config.apiKey?.substring(0, 10) + '...');
        console.error('Full error response:', errorText);
        
        throw new Error(`Vertex AI API error: ${response.status} ${response.statusText}. Details: ${errorText}`);
      }

      const data = await response.json();
      const matches: MLMatch[] = [];

      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const responseText = data.candidates[0].content.parts[0].text;
        
        try {
          // Try to parse the JSON response
          const entities = JSON.parse(responseText.replace(/```json\n?|\n?```/g, ''));
          
          if (Array.isArray(entities)) {
            for (const entity of entities) {
              if (entity.text && entity.type && typeof entity.start === 'number') {
                matches.push({
                  value: entity.text,
                  label: this.mapEntityTypeToLabel(entity.type as MLEntity['type']),
                  confidence: entity.confidence || 0.8,
                  startIndex: entity.start,
                  endIndex: entity.end || (entity.start + entity.text.length),
                  method: 'ml-ner',
                  context: this.extractContext(text, entity.start, entity.end || (entity.start + entity.text.length))
                });
              }
            }
          }
        } catch (parseError) {
          console.error('Failed to parse Vertex AI response:', parseError);
          console.log('Raw response:', responseText);
          throw new Error('Vertex AI returned an invalid response. The model may not be properly configured for entity extraction.');
        }
      }

      return matches;
    } catch (error) {
      console.error('Vertex AI error:', error);
      throw new Error('Vertex AI API failed. Please check your API key and ensure it has access to the Gemini API.');
    }
  }

  private async detectWithLocalModel(): Promise<MLMatch[]> {
    // Implementation would use a local spaCy/transformers service
    throw new Error('Local ML model not configured. Please set up model service.');
  }


  public updateConfig(config: Partial<MLServiceConfig>): void {
    this.config = { ...this.config, ...config };
  }

  public isConfigured(): boolean {
    if (!this.config.enabled) {
      return false;
    }

    switch (this.config.provider) {
      case 'google':
        return !!(this.config.apiKey || process.env.GOOGLE_CLOUD_API_KEY);
      case 'vertex':
        return !!(this.config.apiKey || process.env.GOOGLE_CLOUD_API_KEY);
      case 'aws':
        return !!(this.config.apiKey || process.env.AWS_ACCESS_KEY_ID);
      case 'azure':
        return !!(this.config.apiKey || process.env.AZURE_API_KEY);
      case 'local':
        return !!(this.config.endpoint || process.env.ML_ENDPOINT);
      default:
        return false;
    }
  }

  public getConfigStatus(): { 
    configured: boolean; 
    provider: string; 
    hasApiKey: boolean; 
    message: string;
  } {
    const hasApiKey = !!this.config.apiKey;
    const configured = this.isConfigured();
    
    let message = '';
    if (!this.config.enabled) {
      message = 'ML detection is disabled';
    } else if (!configured) {
      switch (this.config.provider) {
        case 'google':
          message = 'Google Cloud API key not found. Set GOOGLE_CLOUD_API_KEY or ML_API_KEY environment variable.';
          break;
        case 'vertex':
          message = 'Vertex AI API key not found. Set GOOGLE_CLOUD_API_KEY or ML_API_KEY environment variable.';
          break;
        case 'aws':
          message = 'AWS credentials not found. Set AWS_ACCESS_KEY_ID environment variable.';
          break;
        case 'azure':
          message = 'Azure API key not found. Set AZURE_API_KEY or ML_API_KEY environment variable.';
          break;
        case 'local':
          message = 'Local ML endpoint not configured. Set ML_ENDPOINT environment variable.';
          break;
        default:
          message = 'Unknown ML provider configuration.';
      }
    } else {
      message = `ML detection ready with ${this.config.provider} provider`;
    }

    return {
      configured,
      provider: this.config.provider,
      hasApiKey,
      message
    };
  }
}

// Export a default instance
export const mlPatternService = new MLPatternService();

// Export a function to get a fresh instance with current env vars
export function getMLPatternService(): MLPatternService {
  return new MLPatternService();
}