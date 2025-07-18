import { NextRequest } from 'next/server';
import { llmService } from '@/services/llmService';
import { createSSEResponse } from '@/services/sseService';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  return createSSEResponse(async (send) => {
    // Function to get LLM status
    const getLLMStatus = () => {
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
      const modelInfo = config.model || 'Default';
      
      return {
        configured: isConfigured,
        provider: config.provider,
        providerName,
        model: modelInfo,
        features: {
          datasetEnhancement: isConfigured,
          naturalLanguageAnalysis: isConfigured,
          codeGeneration: isConfigured
        }
      };
    };

    // Send initial status
    try {
      send({
        type: 'llm_status_update',
        data: getLLMStatus(),
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error getting LLM status:', error);
      send({
        type: 'llm_status_update',
        data: {
          configured: false,
          provider: 'none',
          providerName: 'Not Configured',
          model: 'None',
          features: {
            datasetEnhancement: false,
            naturalLanguageAnalysis: false,
            codeGeneration: false
          }
        },
        timestamp: new Date().toISOString()
      });
    }

    // Check for status changes every 30 seconds
    const interval = setInterval(() => {
      try {
        send({
          type: 'llm_status_update',
          data: getLLMStatus(),
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Error getting LLM status:', error);
      }
    }, 30000);

    // Heartbeat to keep connection alive
    const heartbeat = setInterval(() => {
      send({
        type: 'heartbeat',
        timestamp: new Date().toISOString()
      });
    }, 15000);

    // Cleanup on connection close
    if (typeof _request.signal !== 'undefined') {
      _request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        clearInterval(heartbeat);
      });
    }

    // Keep connection open for a maximum of 5 minutes
    return new Promise((resolve) => {
      const maxDuration = setTimeout(() => {
        clearInterval(interval);
        clearInterval(heartbeat);
        resolve();
      }, 5 * 60 * 1000); // 5 minutes
      
      // Also cleanup on abort
      if (typeof _request.signal !== 'undefined') {
        _request.signal.addEventListener('abort', () => {
          clearTimeout(maxDuration);
          resolve();
        });
      }
    });
  });
}