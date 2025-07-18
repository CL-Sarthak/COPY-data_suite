/**
 * LLM Service for intelligent dataset analysis and enhancement
 * Supports multiple LLM providers for true dynamic analysis
 */

export interface LLMConfig {
  provider: 'anthropic' | 'openai' | 'vertex' | 'none';
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMAnalysisRequest {
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LLMAnalysisResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: string;
}

export class LLMService {
  private config: LLMConfig;
  
  constructor(config?: Partial<LLMConfig>) {
    const isServer = typeof window === 'undefined';
    
    if (!isServer) {
      this.config = {
        provider: 'none',
        ...config
      };
    } else {
      // Server-side: use environment variables
      const detectedProvider = this.detectProvider();
      this.config = {
        provider: detectedProvider,
        apiKey: process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || process.env.VERTEX_API_KEY,
        model: process.env.LLM_MODEL || this.getDefaultModelForProvider(detectedProvider),
        temperature: 0.7,
        maxTokens: 2000,
        ...config
      };
    }
    
    console.log('[LLMService] Initialized with provider:', this.config.provider);
  }
  
  private detectProvider(): LLMConfig['provider'] {
    if (process.env.ANTHROPIC_API_KEY) return 'anthropic';
    if (process.env.OPENAI_API_KEY) return 'openai';
    if (process.env.VERTEX_PROJECT_ID) return 'vertex';
    return 'none';
  }
  
  private getDefaultModel(): string {
    const provider = this.config?.provider || 'none';
    return this.getDefaultModelForProvider(provider);
  }
  
  private getDefaultModelForProvider(provider: LLMConfig['provider']): string {
    switch (provider) {
      case 'anthropic':
        return 'claude-3-haiku-20240307'; // Fast and cost-effective
      case 'openai':
        return 'gpt-4-turbo-preview';
      case 'vertex':
        return 'gemini-pro';
      default:
        return 'none';
    }
  }
  
  async analyze(request: LLMAnalysisRequest): Promise<LLMAnalysisResponse> {
    switch (this.config.provider) {
      case 'anthropic':
        return this.analyzeWithAnthropic(request);
      case 'openai':
        return this.analyzeWithOpenAI(request);
      case 'vertex':
        return this.analyzeWithVertex(/* request */);
      default:
        throw new Error('No LLM provider configured. Please set ANTHROPIC_API_KEY, OPENAI_API_KEY, or configure Vertex AI to use dataset enhancement features.');
    }
  }
  
  private async analyzeWithAnthropic(request: LLMAnalysisRequest): Promise<LLMAnalysisResponse> {
    if (!this.config.apiKey) {
      throw new Error('Anthropic API key not configured');
    }
    
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: this.config.model || 'claude-3-haiku-20240307',
          max_tokens: request.maxTokens || this.config.maxTokens,
          temperature: request.temperature || this.config.temperature,
          system: request.systemPrompt || 'You are an expert data analyst specializing in dataset structure analysis.',
          messages: [
            {
              role: 'user',
              content: request.prompt
            }
          ]
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Anthropic API error: ${error.error?.message || 'Unknown error'}`);
      }
      
      const data = await response.json();
      
      return {
        content: data.content[0].text,
        usage: {
          promptTokens: data.usage.input_tokens,
          completionTokens: data.usage.output_tokens,
          totalTokens: data.usage.input_tokens + data.usage.output_tokens
        },
        model: data.model,
        provider: 'anthropic'
      };
    } catch (error) {
      console.error('Anthropic API error:', error);
      throw error;
    }
  }
  
  private async analyzeWithOpenAI(request: LLMAnalysisRequest): Promise<LLMAnalysisResponse> {
    if (!this.config.apiKey) {
      throw new Error('OpenAI API key not configured');
    }
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model || 'gpt-4-turbo-preview',
          messages: [
            {
              role: 'system',
              content: request.systemPrompt || 'You are an expert data analyst specializing in dataset structure analysis.'
            },
            {
              role: 'user',
              content: request.prompt
            }
          ],
          temperature: request.temperature || this.config.temperature,
          max_tokens: request.maxTokens || this.config.maxTokens
        })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`OpenAI API error: ${error.error?.message || 'Unknown error'}`);
      }
      
      const data = await response.json();
      
      return {
        content: data.choices[0].message.content,
        usage: {
          promptTokens: data.usage.prompt_tokens,
          completionTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens
        },
        model: data.model,
        provider: 'openai'
      };
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }
  
  private async analyzeWithVertex(/* request: LLMAnalysisRequest */): Promise<LLMAnalysisResponse> {
    // Vertex AI implementation would go here
    throw new Error('Vertex AI integration not implemented yet');
  }
  
}

// Singleton instance for easy access
export const llmService = new LLMService();