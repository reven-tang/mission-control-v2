import { NextRequest } from 'next/server';

// SSE endpoint for real-time updates
export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      controller.enqueue(encoder.encode('event: connected\ndata: {"type":"connected"}\n\n'));

      // Keep connection alive with heartbeat every 30s
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode('event: heartbeat\ndata: {"type":"heartbeat","timestamp":' + Date.now() + '}\n\n'));
      }, 30000);

      // Clean up on close
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}