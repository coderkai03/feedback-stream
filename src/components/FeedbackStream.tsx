'use client';

import { useState, useEffect, useRef } from 'react';
import { FeedbackItem } from '@/lib/cosmos';
import FeedbackCard from './FeedbackCard';
import { Wifi, WifiOff, RefreshCw, MessageCircle, Search, Filter, X } from 'lucide-react';

// Add filter interface
interface FeedbackFilters {
  name: string;
  email: string;
  feedback: string;
  dateFrom: string;
  dateTo: string;
}

export default function FeedbackStream() {
  const [feedbackItems, setFeedbackItems] = useState<FeedbackItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<FeedbackItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newItemsCount, setNewItemsCount] = useState(0);
  const [filters, setFilters] = useState<FeedbackFilters>({
    name: '',
    email: '',
    feedback: '',
    dateFrom: '',
    dateTo: ''
  });
  const eventSourceRef = useRef<EventSource | null>(null);
  const lastTimestampRef = useRef<number>(0);

  // Filter function
  const applyFilters = (items: FeedbackItem[], filterState: FeedbackFilters) => {
    return items.filter(item => {
      const nameMatch = !filterState.name || 
        item.userName.toLowerCase().includes(filterState.name.toLowerCase());
      
      const emailMatch = !filterState.email || 
        item.userEmail.toLowerCase().includes(filterState.email.toLowerCase());
      
      const feedbackMatch = !filterState.feedback || 
        item.feedbackText.toLowerCase().includes(filterState.feedback.toLowerCase());
      
      const dateMatch = (() => {
        if (!filterState.dateFrom && !filterState.dateTo) return true;
        
        const itemDate = new Date(item.createdAt);
        const fromDate = filterState.dateFrom ? new Date(filterState.dateFrom) : null;
        const toDate = filterState.dateTo ? new Date(filterState.dateTo) : null;
        
        if (fromDate && toDate) {
          return itemDate >= fromDate && itemDate <= toDate;
        } else if (fromDate) {
          return itemDate >= fromDate;
        } else if (toDate) {
          return itemDate <= toDate;
        }
        return true;
      })();
      
      return nameMatch && emailMatch && feedbackMatch && dateMatch;
    });
  };

  // Update filtered items when filters or feedback items change
  useEffect(() => {
    setFilteredItems(applyFilters(feedbackItems, filters));
  }, [feedbackItems, filters]);

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      name: '',
      email: '',
      feedback: '',
      dateFrom: '',
      dateTo: ''
    });
  };

  // Check if any filters are active
  const hasActiveFilters = Object.values(filters).some(value => value !== '');

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
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                [a] assistant 2.0 BETA
              </h1>
              <h2 className="text-lg font-medium text-gray-600 dark:text-gray-400">
                Live Feedback Stream
              </h2>
            </div>
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

      {/* Main Content with Sidebar */}
      <div className="flex gap-6">
        {/* Feedback List - Left Side */}
        <div className="flex-1">
          <div 
            className="space-y-4 max-h-[85vh] overflow-y-auto"
            onScroll={handleScroll}
          >
            {filteredItems.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  {hasActiveFilters ? 'No feedback items match your filters' : 'No feedback items found'}
                </p>
              </div>
            ) : (
              filteredItems.map((item, index) => (
                <FeedbackCard 
                  key={item.id} 
                  feedback={item} 
                  isNew={index < newItemsCount}
                />
              ))
            )}
          </div>
        </div>

        {/* Filters Sidebar - Right Side */}
        <div className="w-80 flex-shrink-0">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border p-4 sticky top-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Filters</h3>
              <button
                onClick={clearFilters}
                className="flex items-center space-x-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
              >
                <X className="w-4 h-4" />
                <span>Clear All</span>
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Name Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  placeholder="Filter by name..."
                  value={filters.name}
                  onChange={(e) => setFilters(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              {/* Email Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="text"
                  placeholder="Filter by email..."
                  value={filters.email}
                  onChange={(e) => setFilters(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              {/* Feedback Text Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Feedback
                </label>
                <input
                  type="text"
                  placeholder="Filter by feedback text..."
                  value={filters.feedback}
                  onChange={(e) => setFilters(prev => ({ ...prev, feedback: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              {/* Date From Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  From Date
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
              
              {/* Date To Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  To Date
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
            
            {/* Results count */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {filteredItems.length} of {feedbackItems.length} feedback items
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
