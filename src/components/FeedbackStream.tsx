'use client';

import { useState, useEffect, useRef } from 'react';
import { FeedbackItem } from '@/lib/cosmos';
import FeedbackCard from './FeedbackCard';
import { Wifi, WifiOff, RefreshCw, MessageCircle } from 'lucide-react';

export default function FeedbackStream() {
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newItemsCount, setNewItemsCount] = useState(0);
  const eventSourceRef = useRef<EventSource | null>(null);
  const lastTimestampRef = useRef<number>(0);

  // Fetch initial feedback items
  const fetchInitialFeedback = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch('/api/feedback?limit=20');
      const result = await response.json();
      
      if (result.success) {
        setFeedbackItems(result.data);
        if (result.data.length > 0) {
          // Get the latest timestamp for streaming
          const latestItem = result.data[0];
          lastTimestampRef.current = new Date(latestItem.createdAt).getTime();
        }
      } else {
        setError(result.message || 'Failed to fetch feedback');
      }
    } catch (err) {
      setError('Failed to connect to server');
      console.error('Error fetching initial feedback:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Set up Server-Sent Events connection
  const connectToStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const sinceParam = lastTimestampRef.current > 0 ? `?since=${lastTimestampRef.current}` : '';
    eventSourceRef.current = new EventSource(`/api/feedback/stream${sinceParam}`);

    eventSourceRef.current.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    eventSourceRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'connected') {
          console.log('Connected to feedback stream');
        } else if (data.type === 'new_feedback' && data.data) {
          const newItems = data.data as FeedbackItem[];
          if (newItems.length > 0) {
            setFeedbackItems(prev => {
              // Filter out duplicates and add new items
              const existingIds = new Set(prev.map(item => item.id));
              const uniqueNewItems = newItems.filter(item => !existingIds.has(item.id));
              
              if (uniqueNewItems.length > 0) {
                setNewItemsCount(prev => prev + uniqueNewItems.length);
                return [...uniqueNewItems, ...prev];
              }
              return prev;
            });
          }
        } else if (data.type === 'error') {
          setError(data.message);
        }
      } catch (err) {
        console.error('Error parsing SSE data:', err);
      }
    };

    eventSourceRef.current.onerror = () => {
      setIsConnected(false);
      setError('Connection lost. Attempting to reconnect...');
      
      // Attempt to reconnect after 3 seconds
      setTimeout(() => {
        if (eventSourceRef.current?.readyState === EventSource.CLOSED) {
          connectToStream();
        }
      }, 3000);
    };
  };

  // Initialize
  useEffect(() => {
    fetchInitialFeedback();
    connectToStream();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Clear new items count when user scrolls to top
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop } = e.currentTarget;
    if (scrollTop === 0 && newItemsCount > 0) {
      setNewItemsCount(0);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-gray-600 dark:text-gray-300">Loading feedback...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              [a] assistant 2.0 BETA
            </h1>
            <h2 className="text-lg font-medium text-gray-600 dark:text-gray-400">
              Live Feedback Stream
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            {isConnected ? (
              <div className="flex items-center space-x-1 text-green-600">
                <Wifi className="w-4 h-4" />
                <span className="text-sm">Live</span>
              </div>
            ) : (
              <div className="flex items-center space-x-1 text-red-600">
                <WifiOff className="w-4 h-4" />
                <span className="text-sm">Disconnected</span>
              </div>
            )}
          </div>
        </div>
        
        {newItemsCount > 0 && (
          <div className="mt-2 p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {newItemsCount} new feedback item{newItemsCount > 1 ? 's' : ''} received
            </p>
          </div>
        )}
        
        {error && (
          <div className="mt-2 p-3 bg-red-100 dark:bg-red-900 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}
      </div>

      {/* Feedback List */}
      <div 
        className="space-y-4 max-h-[70vh] overflow-y-auto"
        onScroll={handleScroll}
      >
        {feedbackItems.length === 0 ? (
          <div className="text-center py-12">
            <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No feedback items found</p>
          </div>
        ) : (
          feedbackItems.map((item, index) => (
            <FeedbackCard 
              key={item.id} 
              feedback={item} 
              isNew={index < newItemsCount}
            />
          ))
        )}
      </div>
    </div>
  );
}
