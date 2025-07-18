import { NextResponse } from 'next/server';
import { llmService } from '@/services/llmService';

export async function GET() {
  try {
    // Access the private config property
    const service = llmService as unknown as { config: { provider: string; apiKey?: string; model?: string } };
    const config = service.config;
    
    // Check if LLM is properly configured
    const isConfigured = config.provider !== 'none' && !!config.apiKey;
    
    // Get provider display name
    const providerNames: Record<string, string> = {
      'anthropic': 'Anthropic Claude',
      'openai': 'OpenAI GPT',
      'vertex': 'Google Vertex AI',
      'none': 'Not Configured'
    };
    
    const providerName = providerNames[config.provider] || config.provider;
    
    // Get model info
    const modelInfo = config.model || 'Default';
    
    return NextResponse.json({
      configured: isConfigured,
      provider: config.provider,
      providerName,
      model: modelInfo,
      features: {
        datasetEnhancement: isConfigured,
        naturalLanguageAnalysis: isConfigured,
        codeGeneration: isConfigured
      }
    });
  } catch (error) {
    console.error('Error checking LLM status:', error);
    return NextResponse.json({
      configured: false,
      provider: 'none',
      providerName: 'Not Configured',
      model: 'None',
      features: {
        datasetEnhancement: false,
        naturalLanguageAnalysis: false,
        codeGeneration: false
      }
    });
  }
}