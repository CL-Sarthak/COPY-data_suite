import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/database/connection';
import { InboundApiConnectionEntity } from '@/entities/InboundApiConnectionEntity';
import { logger } from '@/utils/logger';

// GET /api/inbound-connections/updates - SSE endpoint for real-time updates
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      
      const sendUpdate = async () => {
        try {
          const database = await getDatabase();
          const repository = database.getRepository(InboundApiConnectionEntity);
          
          const connections = await repository.find({
            order: { createdAt: 'DESC' }
          });
          
          // Map database fields to frontend interface
          const mappedConnections = connections.map(connection => ({
            id: connection.id,
            name: connection.name,
            description: connection.description,
            apiKey: connection.api_key,
            status: connection.status,
            dataMode: connection.data_mode,
            customUrl: connection.custom_url,
            apiKeyHeader: connection.api_key_header,
            requireApiKey: connection.require_api_key,
            dataSourceId: connection.data_source_id,
            requestCount: connection.request_count,
            lastRequestAt: connection.last_request_at,
            createdAt: connection.createdAt,
            updatedAt: connection.updatedAt
          }));
          
          const data = JSON.stringify({
            timestamp: new Date().toISOString(),
            connections: mappedConnections
          });
          
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        } catch (error) {
          logger.error('Error sending SSE update:', error);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Update failed' })}\n\n`));
        }
      };
      
      // Send initial data
      sendUpdate();
      
      // Send updates every 5 seconds
      const intervalId = setInterval(sendUpdate, 5000);
      
      // Clean up on connection close
      request.signal.addEventListener('abort', () => {
        clearInterval(intervalId);
        controller.close();
      });
    }
  });
  
  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control'
    }
  });
}