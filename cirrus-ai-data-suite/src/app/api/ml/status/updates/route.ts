import { NextRequest } from 'next/server';
import { mlPatternService } from '@/services/mlPatternService';
import { createSSEResponse } from '@/services/sseService';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  return createSSEResponse(async (send) => {
    // Function to get ML status
    const getMLStatus = () => {
      const status = mlPatternService.getConfigStatus();
      return {
        configured: status.configured,
        provider: status.provider,
        hasApiKey: status.hasApiKey,
        message: status.message
      };
    };

    // Send initial status
    send({
      type: 'ml_status_update',
      data: getMLStatus(),
      timestamp: new Date().toISOString()
    });

    // Check for status changes every 30 seconds
    const interval = setInterval(() => {
      send({
        type: 'ml_status_update',
        data: getMLStatus(),
        timestamp: new Date().toISOString()
      });
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

    // Keep connection open
    return new Promise(() => {});
  });
}