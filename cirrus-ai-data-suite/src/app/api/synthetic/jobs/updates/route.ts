import { NextRequest } from 'next/server';
import { SyntheticDataService } from '@/services/syntheticDataService';

// GET /api/synthetic/jobs/updates - Server-Sent Events for real-time job updates
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  
  // Create a TransformStream for SSE
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  
  // Set up SSE headers
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable Nginx buffering
  });

  // Send initial connection message
  const sendEvent = async (data: { type: string; jobs?: unknown[] }) => {
    const message = `data: ${JSON.stringify(data)}\n\n`;
    await writer.write(encoder.encode(message));
  };

  // Send heartbeat to keep connection alive
  const heartbeatInterval = setInterval(async () => {
    try {
      await writer.write(encoder.encode(': heartbeat\n\n'));
    } catch {
      clearInterval(heartbeatInterval);
      clearInterval(periodicCheck);
    }
  }, 30000); // Every 30 seconds

  // Send initial job list immediately when connection opens
  (async () => {
    try {
      const jobs = await SyntheticDataService.getAllJobs();
      await sendEvent({ type: 'jobs_update', jobs });
    } catch (error) {
      console.error('Error sending initial jobs:', error);
    }
  })();

  // Set up a periodic check every 1 second to ensure real-time updates
  const periodicCheck = setInterval(async () => {
    try {
      const jobs = await SyntheticDataService.getAllJobs();
      await sendEvent({ type: 'jobs_update', jobs });
    } catch (error) {
      console.error('Error in periodic check:', error);
    }
  }, 1000); // Check every second for better responsiveness

  // Clean up on disconnect
  request.signal.addEventListener('abort', () => {
    clearInterval(heartbeatInterval);
    clearInterval(periodicCheck);
    writer.close();
  });

  return new Response(stream.readable, { headers });
}