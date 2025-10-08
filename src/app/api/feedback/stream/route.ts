import { NextRequest } from 'next/server';
import { getLatestFeedbackItems } from '@/lib/cosmos';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sinceTimestamp = searchParams.get('since');
  
  // Set up Server-Sent Events
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const data = JSON.stringify({ 
        type: 'connected', 
        message: 'Connected to feedback stream',
        timestamp: Date.now()
      });
      controller.enqueue(encoder.encode(`data: ${data}\n\n`));

      // Function to check for new feedback
      const checkForNewFeedback = async () => {
        try {
          const since = sinceTimestamp ? parseInt(sinceTimestamp) : undefined;
          const newItems = await getLatestFeedbackItems(since);
          
          if (newItems.length > 0) {
            const data = JSON.stringify({
              type: 'new_feedback',
              data: newItems,
              timestamp: Date.now()
            });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        } catch (error) {
          console.error('Error checking for new feedback:', error);
          const errorData = JSON.stringify({
            type: 'error',
            message: 'Failed to fetch new feedback',
            timestamp: Date.now()
          });
          controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        }
      };

      // Check for new feedback every 2 seconds
      const interval = setInterval(checkForNewFeedback, 2000);

      // Cleanup function
      const cleanup = () => {
        clearInterval(interval);
        controller.close();
      };

      // Handle client disconnect
      request.signal.addEventListener('abort', cleanup);
      
      // Also cleanup after 5 minutes to prevent memory leaks
      setTimeout(cleanup, 5 * 60 * 1000);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}
